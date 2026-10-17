# PartyBros

Real-time multiplayer game room. Pick a game on the home page — classic Werewolf (Mafia) with an automated server-side moderator, One Night Ultimate Werewolf for a single fast round, Feed the Kraken for a ship full of suspects, Insider for a word hunt with a mole, CS Files for a crime scene with a silent forensic expert, or Tic Tac Toe for a quick 1v1 — then create or join a room by code.

## Stack

- Next.js 14 (App Router) + React + TypeScript
- Tailwind CSS + Shadcn-style UI primitives (`components/ui`)
- Socket.io on a custom Node HTTP server (`server.js`) — required over pure WebRTC/client-to-client because roles are hidden information the server must arbitrate
- Zustand for client UI state

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000, pick a game, create a room, share the 5-letter code, open more tabs/devices and join.

## Language (EN / TH)

A `LanguageSwitcher` (top of the home page and the room header) toggles the whole UI between English and Thai instantly, no reload needed. `lib/i18n/translations.ts` holds one `en` dictionary and one `th` dictionary — TypeScript enforces they have identical shape (`const th: Messages = {...}` fails to compile if a key is missing), so the two languages can't drift out of sync silently. `store/useLocaleStore.ts` persists the choice to `localStorage` via zustand's `persist` middleware. `lib/i18n/useTranslation.ts` exposes `t(key, vars?)` for plain lookups with `{{var}}` interpolation, and `tp(key, count, vars?)` for the `_one`/`_other` pluralized keys (e.g. `werewolf.voting.vote_one` / `_other`).

**Scope boundary**: this covers all UI chrome — labels, buttons, role names/descriptions, instructions, timers. It does **not** cover the server-generated game log narration (`room.log`, e.g. "Alice was found dead. They were a WEREWOLF.") or the short-lived validation error strings from `server.js`/`lib/*Logic.js` (e.g. "Not your turn.") — those are still plain English on the wire. Translating them would mean the server emits structured keys instead of pre-rendered sentences, which is a larger refactor than the UI-layer translation this task covers.

## Architecture

### Multi-game rooms

Every room carries a `gameType` (`WEREWOLF` | `TICTACTOE` | `ONE_NIGHT_WEREWOLF` | `FEED_THE_KRAKEN`) set at creation time (`lib/rooms.js#createRoom`). `server.js` and `lib/stateFilter.js` branch on it, and `app/room/[code]/page.tsx` renders the matching room component based on the same field in the payload the client receives. Adding another game means: a `lib/<game>Logic.js` state machine, a `get<Game>View` branch in `stateFilter.js`, socket handlers in `server.js`, and a room component — the lobby/reconnect/room-code plumbing is shared.

**Important footgun this project hit while adding a third game**: classic Werewolf and One Night Werewolf both use the phase labels `NIGHT`/`DAY`/`VOTING`, and their socket handlers originally had no `gameType` guard. A handler like `wolf_vote` (classic-only) would happily run against an ONW room sitting in `NIGHT` phase too, corrupting state it doesn't understand. Every handler that isn't already scoped by a room-shape-specific check (`ttt_*`, `onw_*` prefixes) now explicitly checks `room.gameType` before touching the room. If you add a fourth game that reuses these phase names, audit every existing handler for a missing gameType guard rather than assuming the phase check alone is enough.

### Why a custom Socket.io server

Werewolf is a hidden-information game: villagers must never learn who the werewolves are except through gameplay (the Seer's power, deaths, deduction). That's impossible to guarantee with peer-to-peer or a client that holds the full game state — anyone could open devtools and read it. So `server.js` boots a Node HTTP server, attaches Socket.io to it, and wraps the Next.js request handler. All game state lives only in server memory (`lib/rooms.js`); clients are dumb renderers of whatever the server chooses to send them.

### State filtering (the anti-cheat boundary)

`lib/stateFilter.js` exports `getFilteredState(room, viewerId)` — the **only** function permitted to turn the full authoritative room object into a socket payload. It is called once per connected socket on every broadcast (`server.js`'s `broadcastRoom`), so each player gets their own view:

- A player's `role` field on another player is `null` unless: it's their own entry, both are alive werewolves, the target is dead, or the game is over.
- Only werewolves receive `wolfChat` / `wolfVotes` in the `night` block; everyone else gets an empty array / `undefined`.
- The Seer's `seerResult` is only ever attached to the Seer's own payload, and only reflects their own most recent check.
- Doctor/Seer/Werewolf action confirmation (`youActed`) tells a client "your action was received" without revealing anyone else's choice.
- **One Night Werewolf**: nobody's `role`/`startingRole` is ever sent for anyone but themselves until `GAME_OVER` — not even a "your role" field is exposed generically, only through the specific reveal that actually surfaces it (`myNightLog` entries), since e.g. a Troublemaker's swap target isn't supposed to learn their card changed. Center cards are per-slot: a slot's `role` is `null` unless *this* viewer personally peeked that exact slot, and then it's the card **as they saw it**, read from their own `myNightLog` entry — never the slot's current card (a Drunk swapping with that slot later must not be revealed to the earlier peeker). Everyone sees the real cards once the game has ended.

Because filtering happens server-side per recipient, there is no client-side flag or state a player could flip in devtools to see hidden roles — the data simply never reaches their browser.

### Game state machine

`lib/gameLogic.js` holds pure(ish) transition functions operating on a room object: `startGame` → `beginNight` → night actions → `resolveNight` → `startVoting` → `castVote` → `resolveVoting` → `checkWinCondition` → `endGame`. `server.js` calls these in response to socket events and re-broadcasts the filtered state after every mutation.

Phases: `LOBBY → ROLE_REVEAL → NIGHT → DAY → VOTING → (NIGHT | GAME_OVER)`.

Tic Tac Toe is far simpler (no hidden information, just turn order) and lives in `lib/tictactoeLogic.js`: `startGame` randomly assigns X/O to the room's exactly-2 players, `makeMove` validates turn + empty cell and checks the 8 win lines, `rematch` swaps who goes first and resets the board without leaving the room.

One Night Ultimate Werewolf (`lib/onuwLogic.js`) is a single-night game: the deck has exactly `players + 3` cards, everyone gets one, 3 go face-down to the "center." Night proceeds through a **fixed wake order** (`ONW_NIGHT_ORDER` in `lib/types.js`: Werewolf → Minion → Mason → Seer → Robber → Troublemaker → Drunk → Insomniac); a role with nobody holding it as their *starting* card is skipped automatically. Eligibility for each step is based on the card a player was **originally dealt** (`startingRole`), not their current card — exactly matching the tabletop rule, since a player only knows to "wake up" from their own memory of what they were dealt, not from cards that moved around after. Robber/Troublemaker/Drunk mutate `player.role` (current card); `startingRole` never changes. After the night, one Day discussion and a single Voting round follow — ties don't cause a revote like classic Werewolf, *everyone* tied for the most votes dies (official ONUW rule), with a Hunter's death chaining to whoever they voted for. Win conditions in `checkWinner`: a dead Tanner wins alone; otherwise a dead Werewolf means the Village wins; otherwise the Werewolves win (or the Village wins by default if there were no Werewolves in play and nobody died).

Feed the Kraken (`lib/krakenLogic.js` + rule tables in `lib/krakenRules.js`) follows the published box rules: 5–11 players, secret factions (Sailors, Pirates, one Cult Leader; Cultists only appear through Conversion, or one is dealt at 11 players), 3 guns each. A round is `KR_APPOINT` (Captain names Lieutenant + Navigator, skipping off-duty players) → `KR_MUTINY` (everyone but the Captain secretly commits guns; reaching the threshold — 3/4/5 by table size — makes the top gun-holder Captain and spends the revealed guns) → `KR_NAV_DISCARD` (Captain and Lieutenant each draw 2 and discard 1) → `KR_NAV_CHOOSE` (Navigator plays one of the two passed cards) → optional `KR_ACTION` (map space: Cabin Search / Flogging / Off with the Tongue / Feed the Kraken, resolved by the Captain) and `KR_RITUAL` (Cult Uprising: Gun Stash / Cult Search / Conversion, resolved by the Cult Leader) → off-duty markers (navigator, lieutenant, captain — 1/2/3 by table size) → next round. Card effects: Drunk (command passes to the next player with the fewest résumés), Mermaid, Telescope, Armed, Disarmed, Cult Uprising. Red steers west to Crimson Cove (Pirates), blue east to Bluewater Bay (Sailors), yellow north to the Kraken (Cult — who also win if the Cult Leader is fed to it).

**What's our own invention**: the real hex map isn't published anywhere we could read, so `KRAKEN_MAPS` (distances to each destination, where the action spaces sit, the supply line) is our own layout, tuned by simulation. The per-color breakdown of card effects comes from a single rules summary. Both live in `lib/krakenRules.js` as plain data so they can be corrected without touching the state machine. Not implemented: character powers and Denial of Command (Navigator jumping overboard).

Hidden information: `getKrakenView` reveals a role only to its owner, to fellow dealt Pirates, between a Cult Leader and their converts, and to everyone at game over. Navigation hands, the navigator's two options, cabin-search / mermaid / telescope / cult-search results and gun-stash receipts go only to the player entitled to them (`privateLog`); mutiny commits are public only once revealed. All game state sits under `room.kr`, so `rekeyPlayer` re-keys a reconnecting player by walking that one object. The host has `kraken_force_advance` for every phase.

Insider (`lib/insiderLogic.js`, word pool of ~350 Thai/English words in `lib/insiderWords.js`): 4–12 players (the box says 4–8; we allow up to 12). One public Master, one hidden Insider, the rest Commons. The host decides each round's Master in the lobby or on the results screen (`insider_set_master`): next in line (default), random, or a player they pick; a picked player who has left falls back to next in line. `INS_WORD` (the Master picks one of 3 words, or rerolls) → `INS_QUESTIONS` (host-set 3/5/7 min; askers type yes/no questions, the Master answers Yes / No / Don't know / Correct; typing the exact word in either language counts as a correct guess) → `INS_DISCUSS` (lasts as long as the search took, minimum 20 s, like flipping the sand timer) → `INS_VOTE1` (is the guesser the Insider? a strict majority of all players accuses them) → `INS_VOTE2` if not (everyone names a non-Master player; most votes is accused, ties broken by the guesser's vote, otherwise nobody) → `GAME_OVER`. Commons + Master win if the accused is the Insider, the Insider wins otherwise, and everyone loses if time runs out. Published sources disagree on vote details; the two-vote structure and guesser tie-break above are the version we picked. Every phase change bumps `ins.phaseSeq`; `server.js` schedules one countdown per sequence number and calls `onTimeout`. Scored matches (host picks 3/5/7/10 rounds in the lobby, `room.insMatch`): saying the word is +2, catching the Insider is +1 for everyone except the Insider (the Master included), an Insider who gets away scores +1, and a timeout scores nothing; the host moves straight to the next round from the results screen (`insider_next_round`) and the highest total after the last round wins (ties share the win). Standings and per-round gains are public. `getInsiderView` sends the word only to the Master and the Insider until it's guessed, the Insider's identity only to the Insider, and the second-vote ballots only at game over.

CS Files (`lib/csLogic.js`, cards and tiles in `lib/csData.js`) is the Thai edition of Deception: Murder in Hong Kong, as taught in the GamesKradarn video, plus the Undercover Allies expansion roles: 4–14 players. One public Forensic Scientist (random or picked by the host) knows the solution but can't chat; everyone else gets 3–5 red Means and 3–5 blue Clue cards face up and one badge. `CS_NIGHT` (the Murderer picks one Means + one Clue of their own; Lab Technician tests one card; Rumormonger strips someone's badge) → `CS_CLUES` (Forensic picks one of 4 location tiles and puts one marker on each of 6 tiles) → `CS_DISCUSS` (host-set time) → `CS_PRESENT` (30 s per player, starting left of the Forensic) → `CS_REPLACE` (rounds 2–3: a new scene tile replaces an old one and gets a marker) → … Anyone with a badge can accuse at any time after the night (suspect + one red + one blue in front of them); wrong guesses burn the badge. A correct accusation wins for the investigators unless a Witness is in play and the Murderer then names them (`CS_WITNESS`). The Murderer's side wins after 3 rounds or when every investigator badge is gone. Roles follow the video's setup tables: Accomplice at 6+, Witness at 6+ (toggle), Lab Technician 7+, Rumormonger 8+, Bodyguard 7+ with a Witness (expansion toggles). **Our own choices**: all card and tile text is ours (not the box's), the Rumormonger is on the Murderer's side without knowing the Murderer (the video doesn't say), and Event tiles and the expansion's mystery location tiles aren't included. `getCsView` sends the solution only to the Forensic, Murderer and Accomplice; the Witness gets the two bad guys unordered; the Bodyguard gets the Witness; the Lab result goes only to the Lab Technician.

### Play mode: together or online

Every room (except Tic Tac Toe) has `room.playMode`: `"local"` (everyone at the same table, the default) or `"online"`. It's picked on the create screen and the host can switch it in the lobby (`set_play_mode`); every view carries it. `components/table/PlayMode.tsx` provides it to the UI. In `local` mode chat boxes become a "just talk" panel (the wolves' night chat stays, since they can't whisper at the table), private info (role cards, Seer notes, the ONW night log, Kraken hand and secrets, the Insider word and the Master's word choices) sits behind a tap-to-peek cover that closes itself after a few seconds, and seat badges marked `secret` show as `•••` unless you're peeking. Insider changes its rules slightly: questions are asked out loud, and the Master taps whoever said the word (`ins_mark_correct`) instead of players typing.

### Eyes-closed signals (together mode)

In `local` mode, Werewolf, One Night and CS Files get night cues (`components/table/NightCues.tsx`, device helpers in `lib/nightCues.ts`), all driven client-side from room-state transitions (`deriveCue`): the phone of whoever must wake up buzzes 3 times (`navigator.vibrate`, Android only; iOS has no Vibration API), every phone gives one long buzz at dawn, and one device (the host's by default) reads the night out loud with the Web Speech API in the UI language. Buzzes are delayed a couple of seconds so they land with the spoken "...open your eyes". During a game the screen is kept on with the Screen Wake Lock API, which only works in a secure context (https:// or localhost), so a plain `http://<LAN-IP>:3000` link can let phones sleep through their cue. Settings are per device (`partybros-cues` in localStorage); the lobby panel's "Turn on and test" button supplies the tap browsers require before vibrating or speaking, and the floating pill re-arms it after a reload.

Because the narrator is public, One Night in `local` mode calls every role in the deck (center cards included) and gives each step its full timer: skipping a role, or ending a step early, would tell the table which roles nobody holds. The "N remaining" count is hidden for the same reason.

### Reconnect handling

On create/join, the server returns `{ code, playerId }` (playerId = that socket's id). The client stores both in `sessionStorage`. On page load/refresh it calls `rejoin_room` with the stored `playerId`, and the server re-keys the existing player record onto the new socket id — preserving role/alive state through a refresh or dropped connection (2-minute grace window before the seat is freed).

## File map

```
server.js                        custom Socket.io + Next server, all socket event handlers
lib/types.js                     ROLES / PHASES / TEAMS / GAME_TYPES / ONW_* constants
lib/rooms.js                     in-memory room store, game-type-aware room init (swap for Redis to scale beyond one instance)
lib/gameLogic.js                 Werewolf state machine: role assignment, night resolution, voting, win checks
lib/tictactoeLogic.js            Tic Tac Toe state machine: symbol assignment, move validation, win detection, rematch
lib/onuwLogic.js                 One Night Werewolf state machine: dealing, wake-order sequencing, swap/view actions, voting, win checks
lib/stateFilter.js               per-viewer state filtering, branches by gameType (the security boundary)
app/page.tsx                     home page — game picker + create/join room
app/room/[code]/page.tsx         room shell — connects socket, routes to the right game's UI by gameType
components/game/Lobby.tsx        Werewolf role deck config + player list (host controls)
components/game/RoleReveal.tsx   secret role card
components/game/NightPhase.tsx   werewolf chat/vote, seer/doctor actions, villager wait screen
components/game/DayPhase.tsx     announcement + timed discussion chat
components/game/VotingPhase.tsx  lynch voting UI
components/game/GameOver.tsx     win screen + play again
lib/csLogic.js                   CS Files state machine: night, markers, discussion, presentations, accusations, witness hunt
lib/csData.js                    CS Files means/clue cards and scene tiles (English + Thai, our own wording)
components/csfiles/*             CS Files UI: CsRoom (router), CsLobby (settings + role preview), CsGame (scene tiles, case folders, actions, game over), csMeta
components/table/NightCues.tsx    eyes-closed cues: vibration, narrator voice, keep-awake; deriveCue maps room changes to cues
lib/nightCues.ts                 device helpers: vibrate, speech, Screen Wake Lock
components/table/PlayMode.tsx      play-mode context, tap-to-peek SecretPeek, "just talk" panel, the together/online picker
components/table/CampfireCircle.tsx  the campfire scene (night/day sky, fire, seats in a ring) shared by both Werewolf variants
components/game/PlayerList.tsx   Werewolf village around the campfire (selectable for targeting, vote tallies)
components/game/ChatBox.tsx      shared chat widget
components/game/PhaseTimer.tsx   server-deadline-driven countdown, reused by both Werewolf variants
lib/krakenLogic.js               Feed the Kraken state machine: appoint, mutiny, navigation, map actions, cult rituals, off-duty, win checks
lib/insiderLogic.js              Insider state machine: word pick, questions, discussion, two votes, timeouts
lib/insiderWords.js              Insider word pool (each word in English + Thai) and guess normalization
components/insider/*             Insider UI: InsiderRoom (router), InsiderLobby, InsiderGame (felt table + hourglass, question feed, votes), InsiderTable, InsiderGameOver, insiderMeta
lib/krakenRules.js               Feed the Kraken rule data: faction table, deck, thresholds, off-duty counts, the two hex maps
components/kraken/*              Feed the Kraken UI: KrakenRoom (router), KrakenLobby, KrakenGame (the table: seats, hand, logs), KrakenBoard (SVG hex map + ship), KrakenGameOver, krakenMeta
components/tictactoe/TicTacToeRoom.tsx   Tic Tac Toe lobby, wooden board with walnut X / maple O pieces, rematch UI (all phases)
components/onw/OnwRoom.tsx       One Night Werewolf phase router (Lobby/Night/Day/Voting/GameOver)
components/onw/OnwLobby.tsx      role deck + per-step/day/voting timer config (host controls)
components/onw/OnwNight.tsx      the wake-order sequence UI — per-role action forms, waiting state, step strip
components/onw/OnwDay.tsx        discussion chat + persistent "Your Night Log" recap
components/onw/OnwVoting.tsx     single-round vote grid (everyone votes, ties all die)
components/onw/OnwGameOver.tsx   starting→final role reveal, winner banner, rematch
components/onw/OnwPlayerList.tsx One Night circle around the campfire, with the 3 center cards by the fire (selectable for Seer/Drunk/lone Werewolf)
components/onw/NightLog.tsx      renders a player's private myNightLog entries as readable sentences
components/onw/roleInfo.ts       role labels/icons/descriptions shared across the ONW components
components/ui/*                  button/card/badge/input primitives
store/useGameStore.ts            Zustand client store (room, nickname, errors)
lib/socketClient.ts              socket.io-client singleton
types/game.ts                    shared client-side types — WerewolfRoomState | TicTacToeRoomState | OnwRoomState | KrakenRoomState | InsiderRoomState | CsRoomState union
```

## Notes / next steps

- In-memory rooms mean a server restart wipes all games — fine for a friends game night, not for production scale. Swap `lib/rooms.js` for Redis and this all still works since the filtering/logic layers only touch the room object shape.
- Classic Werewolf's role deck supports Werewolf / Seer / Doctor / Villager; add more roles by extending `ROLES` in `lib/types.js`, the deck builder in `lib/gameLogic.js`, and a case in `RoleReveal.tsx` / `NightPhase.tsx`. Minimum 5 players enforced in `gameLogic.validateRoleConfig`.
- One Night Werewolf's roles (`ONW_ROLES` in `lib/types.js`) cover the base ONUW box: Werewolf, Minion, Mason, Seer, Robber, Troublemaker, Drunk, Insomniac, Tanner, Hunter, Villager. Doppelganger isn't implemented. Minimum 3 players enforced in `onuwLogic.validateStart`; the deck must always total exactly `players + 3`.
