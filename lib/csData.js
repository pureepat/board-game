// CS Files card data. Every card and tile here is our own wording (the real
// decks aren't reproduced): means and clue cards are everyday nouns, scene
// tiles are generic investigation prompts with six options each.
// Each entry carries both languages; the UI shows the viewer's.

const w = (en, th) => ({ en, th });

// Means of murder (red cards).
const CS_MEANS = [
  w("Knife", "มีด"), w("Rope", "เชือก"), w("Pistol", "ปืนพก"), w("Poison", "ยาพิษ"), w("Hammer", "ค้อน"),
  w("Scissors", "กรรไกร"), w("Pillow", "หมอน"), w("Insecticide", "ยาฆ่าแมลง"), w("Sleeping pills", "ยานอนหลับ"),
  w("Brick", "ก้อนอิฐ"), w("Axe", "ขวาน"), w("Plastic bag", "ถุงพลาสติก"), w("Wire", "ลวด"), w("Baseball bat", "ไม้เบสบอล"),
  w("Electric shock", "ไฟช็อต"), w("Ice pick", "ที่เจาะน้ำแข็ง"), w("Syringe", "เข็มฉีดยา"), w("Car", "รถยนต์"),
  w("Fire", "ไฟ"), w("Drowning", "จมน้ำ"), w("Necktie", "เนกไท"), w("Scarf", "ผ้าพันคอ"), w("Bottle", "ขวดแก้ว"),
  w("Screwdriver", "ไขควง"), w("Crossbow", "หน้าไม้"), w("Sword", "ดาบ"), w("Chainsaw", "เลื่อยยนต์"), w("Gas", "แก๊สพิษ"),
  w("Bleach", "น้ำยาฟอกขาว"), w("Rat poison", "ยาเบื่อหนู"), w("Snake venom", "พิษงู"), w("Bee sting", "เหล็กในผึ้ง"),
  w("Frying pan", "กระทะ"), w("Kitchen cleaver", "มีดอีโต้"), w("Fork", "ส้อม"), w("Chopsticks", "ตะเกียบ"),
  w("Trophy", "ถ้วยรางวัล"), w("Golf club", "ไม้กอล์ฟ"), w("Dumbbell", "ดัมเบล"), w("Stone", "ก้อนหิน"),
  w("Shovel", "พลั่ว"), w("Sickle", "เคียว"), w("Arrow", "ลูกธนู"), w("Blowgun", "ลูกดอกเป่า"), w("Bomb", "ระเบิด"),
  w("Hair dryer", "ไดร์เป่าผม"), w("Toaster", "เครื่องปิ้งขนมปัง"), w("Iron", "เตารีด"), w("Chain", "โซ่"),
  w("Handcuffs", "กุญแจมือ"), w("Belt", "เข็มขัด"), w("Shoelace", "เชือกรองเท้า"), w("Towel", "ผ้าขนหนู"),
  w("Ladder", "บันได"), w("Elevator", "ลิฟต์"), w("Window", "หน้าต่าง"), w("Stairs", "บันไดหนีไฟ"), w("Cliff", "หน้าผา"),
  w("Starvation", "อดอาหาร"), w("Freezer", "ตู้แช่แข็ง"), w("Spoiled food", "อาหารบูด"), w("Alcohol", "เหล้า"),
  w("Overdose", "ยาเกินขนาด"), w("Allergy", "อาการแพ้"), w("Bacteria", "เชื้อโรค"), w("Radiation", "กัมมันตรังสี"),
  w("Acid", "กรด"), w("Cactus", "กระบองเพชร"), w("Crocodile", "จระเข้"), w("Dog bite", "หมากัด"),
];

// Key evidence (blue cards).
const CS_CLUES = [
  w("Rag", "ผ้าขี้ริ้ว"), w("Fingerprint", "รอยนิ้วมือ"), w("Lipstick", "ลิปสติก"), w("Cigarette butt", "ก้นบุหรี่"),
  w("Hair", "เส้นผม"), w("Receipt", "ใบเสร็จ"), w("Wallet", "กระเป๋าสตางค์"), w("Key", "กุญแจ"), w("Mobile phone", "มือถือ"),
  w("Diary", "ไดอารี่"), w("Glove", "ถุงมือ"), w("Shoeprint", "รอยรองเท้า"), w("Coffee cup", "แก้วกาแฟ"), w("Ticket", "ตั๋ว"),
  w("Ring", "แหวน"), w("Watch", "นาฬิกา"), w("Earring", "ต่างหู"), w("Button", "กระดุม"), w("Map", "แผนที่"), w("Photo", "รูปถ่าย"),
  w("Letter", "จดหมาย"), w("Banknote", "ธนบัตร"), w("Coin", "เหรียญ"), w("Perfume", "น้ำหอม"), w("Mud", "โคลน"), w("Sand", "ทราย"),
  w("Leaf", "ใบไม้"), w("Feather", "ขนนก"), w("Cat hair", "ขนแมว"), w("Candle", "เทียน"), w("Lighter", "ไฟแช็ก"), w("Matchbox", "กล่องไม้ขีด"),
  w("Newspaper", "หนังสือพิมพ์"), w("Book", "หนังสือ"), w("Pen", "ปากกา"), w("Notebook", "สมุดโน้ต"), w("Calendar", "ปฏิทิน"),
  w("Sticky note", "กระดาษโน้ต"), w("Business card", "นามบัตร"), w("ID card", "บัตรประชาชน"), w("Passport", "หนังสือเดินทาง"),
  w("Credit card", "บัตรเครดิต"), w("Hotel keycard", "คีย์การ์ดโรงแรม"), w("Bus ticket", "ตั๋วรถเมล์"), w("Movie ticket", "ตั๋วหนัง"),
  w("Lottery ticket", "ลอตเตอรี่"), w("Playing card", "ไพ่"), w("Dice", "ลูกเต๋า"), w("Chess piece", "ตัวหมากรุก"), w("Teddy bear", "ตุ๊กตาหมี"),
  w("Balloon", "ลูกโป่ง"), w("Flower", "ดอกไม้"), w("Rose petal", "กลีบกุหลาบ"), w("Wine glass", "แก้วไวน์"), w("Beer can", "กระป๋องเบียร์"),
  w("Tea bag", "ถุงชา"), w("Chewing gum", "หมากฝรั่ง"), w("Candy wrapper", "ห่อขนม"), w("Bread crumbs", "เศษขนมปัง"), w("Chili", "พริก"),
  w("Lemon", "มะนาว"), w("Egg shell", "เปลือกไข่"), w("Bone", "กระดูก"), w("Tooth", "ฟัน"), w("Blood stain", "คราบเลือด"),
  w("Saliva", "น้ำลาย"), w("Sweat", "เหงื่อ"), w("Tears", "น้ำตา"), w("Bandage", "ผ้าพันแผล"), w("Pill bottle", "ขวดยา"),
  w("Glasses", "แว่นตา"), w("Contact lens", "คอนแทคเลนส์"), w("Mask", "หน้ากาก"), w("Wig", "วิกผม"), w("Makeup", "เครื่องสำอาง"),
  w("Nail polish", "ยาทาเล็บ"), w("Tattoo", "รอยสัก"), w("Sock", "ถุงเท้า"), w("Hat", "หมวก"), w("Umbrella", "ร่ม"),
  w("Raincoat", "เสื้อกันฝน"), w("Backpack", "กระเป๋าเป้"), w("Suitcase", "กระเป๋าเดินทาง"), w("Toolbox", "กล่องเครื่องมือ"),
  w("Screw", "ตะปูเกลียว"), w("Nail", "ตะปู"), w("Paint", "สี"), w("Glue", "กาว"), w("Tape", "เทปกาว"), w("Battery", "แบตเตอรี่"),
  w("Charger", "สายชาร์จ"), w("USB drive", "แฟลชไดรฟ์"), w("Laptop", "โน้ตบุ๊ก"), w("Headphones", "หูฟัง"), w("CCTV footage", "ภาพกล้องวงจรปิด"),
  w("Voice message", "ข้อความเสียง"), w("Text message", "ข้อความในแชท"), w("Bank slip", "สลิปโอนเงิน"), w("Delivery box", "กล่องพัสดุ"),
  w("Ice cube", "ก้อนน้ำแข็ง"), w("Ash", "ขี้เถ้า"), w("Broken glass", "เศษแก้ว"), w("Torn page", "กระดาษฉีก"), w("Footstep sound", "เสียงฝีเท้า"),
  w("Dog", "สุนัข"), w("Fish tank", "ตู้ปลา"), w("Plant pot", "กระถางต้นไม้"), w("Amulet", "พระเครื่อง"), w("Incense", "ธูป"),
];

const opt = (...pairs) => pairs.map(([en, th]) => w(en, th));
const tile = (id, en, th, options) => ({ id, title: w(en, th), options });

// Always on the board, first in the row.
const CS_CAUSE_TILE = tile("cause", "Cause of Death", "สาเหตุการตาย", opt(
  ["Suffocation", "ขาดอากาศหายใจ"], ["Severe injury", "บาดเจ็บสาหัส"], ["Loss of blood", "เสียเลือดมาก"],
  ["Illness", "เจ็บป่วย"], ["Poisoning", "ได้รับสารพิษ"], ["Accident", "อุบัติเหตุ"],
));

// The Forensic Scientist picks one of these as the second tile.
const CS_LOCATION_TILES = [
  tile("loc-home", "Location: Home", "สถานที่: บ้าน", opt(
    ["Bedroom", "ห้องนอน"], ["Living room", "ห้องนั่งเล่น"], ["Kitchen", "ห้องครัว"],
    ["Bathroom", "ห้องน้ำ"], ["Garden", "สวน"], ["Garage", "โรงรถ"],
  )),
  tile("loc-public", "Location: Public place", "สถานที่: ที่สาธารณะ", opt(
    ["Park", "สวนสาธารณะ"], ["Restaurant", "ร้านอาหาร"], ["Market", "ตลาด"],
    ["Train station", "สถานีรถไฟ"], ["Hospital", "โรงพยาบาล"], ["Cinema", "โรงหนัง"],
  )),
  tile("loc-building", "Location: Building", "สถานที่: อาคาร", opt(
    ["Office", "ออฟฟิศ"], ["Factory", "โรงงาน"], ["Hotel", "โรงแรม"],
    ["School", "โรงเรียน"], ["Rooftop", "ดาดฟ้า"], ["Parking lot", "ลานจอดรถ"],
  )),
  tile("loc-outdoors", "Location: Outdoors", "สถานที่: กลางแจ้ง", opt(
    ["Forest", "ป่า"], ["Beach", "ชายหาด"], ["River", "แม่น้ำ"],
    ["Mountain", "ภูเขา"], ["Rice field", "ทุ่งนา"], ["Roadside", "ข้างถนน"],
  )),
];

// Drawn at random: 4 to start, then one more each later round.
const CS_SCENE_TILES = [
  tile("time", "Time of Death", "เวลาเสียชีวิต", opt(["Dawn", "เช้ามืด"], ["Morning", "เช้า"], ["Noon", "เที่ยง"], ["Afternoon", "บ่าย"], ["Evening", "ค่ำ"], ["Midnight", "เที่ยงคืน"])),
  tile("duration", "Duration of Crime", "ระยะเวลาก่อเหตุ", opt(["Instant", "ทันที"], ["Brief", "สั้น ๆ"], ["Gradual", "ค่อยเป็นค่อยไป"], ["Prolonged", "ยาวนาน"], ["A few days", "หลายวัน"], ["Unclear", "ไม่แน่ชัด"])),
  tile("state", "State of the Scene", "สภาพที่เกิดเหตุ", opt(["Tidy", "เรียบร้อย"], ["Messy", "รก"], ["Broken items", "ของแตกหัก"], ["Wet", "เปียก"], ["Burnt", "ไหม้"], ["Bloody", "เลือดเต็ม"])),
  tile("body", "Victim's Build", "รูปร่างผู้ตาย", opt(["Tall", "สูง"], ["Short", "เตี้ย"], ["Thin", "ผอม"], ["Heavy", "อ้วน"], ["Muscular", "กำยำ"], ["Frail", "อ่อนแอ"])),
  tile("job", "Victim's Occupation", "อาชีพผู้ตาย", opt(["Office worker", "พนักงานออฟฟิศ"], ["Student", "นักเรียน"], ["Doctor", "หมอ"], ["Merchant", "พ่อค้า"], ["Artist", "ศิลปิน"], ["Retired", "เกษียณ"])),
  tile("age", "Victim's Age", "อายุผู้ตาย", opt(["Child", "เด็ก"], ["Teen", "วัยรุ่น"], ["Young adult", "วัยทำงาน"], ["Middle-aged", "วัยกลางคน"], ["Elderly", "สูงอายุ"], ["Unknown", "ไม่ทราบ"])),
  tile("killer", "Killer's Personality", "บุคลิกฆาตกร", opt(["Calm", "ใจเย็น"], ["Hot-tempered", "อารมณ์รุนแรง"], ["Cunning", "เจ้าเล่ห์"], ["Nervous", "ขี้กังวล"], ["Arrogant", "หยิ่ง"], ["Careless", "ประมาท"])),
  tile("motive", "Motive", "แรงจูงใจ", opt(["Money", "เงิน"], ["Love", "ความรัก"], ["Revenge", "แก้แค้น"], ["Jealousy", "อิจฉา"], ["Fear", "ความกลัว"], ["Accident", "ไม่ได้ตั้งใจ"])),
  tile("relation", "Relationship", "ความสัมพันธ์", opt(["Family", "ครอบครัว"], ["Lover", "คนรัก"], ["Friend", "เพื่อน"], ["Coworker", "เพื่อนร่วมงาน"], ["Neighbor", "เพื่อนบ้าน"], ["Stranger", "คนแปลกหน้า"])),
  tile("witness", "Witness Statement", "คำให้การผู้เห็นเหตุการณ์", opt(["Heard a sound", "ได้ยินเสียง"], ["Saw a shadow", "เห็นเงา"], ["Smelled something", "ได้กลิ่น"], ["Felt a shake", "รู้สึกสั่น"], ["Nothing unusual", "ไม่มีอะไรผิดปกติ"], ["Saw two people", "เห็นสองคน"])),
  tile("trace", "Traces at the Scene", "ร่องรอยในที่เกิดเหตุ", opt(["Fingerprints", "รอยนิ้วมือ"], ["Footprints", "รอยเท้า"], ["Stains", "คราบ"], ["Scratches", "รอยขีดข่วน"], ["Nothing left", "ไม่มีร่องรอย"], ["Something taken", "ของหายไป"])),
  tile("weather", "Weather", "สภาพอากาศ", opt(["Sunny", "แดดจ้า"], ["Rainy", "ฝนตก"], ["Stormy", "พายุ"], ["Hot", "ร้อน"], ["Cold", "หนาว"], ["Foggy", "หมอกลง"])),
  tile("sense", "Strongest Sense", "ประสาทสัมผัสที่เด่น", opt(["Sight", "การมองเห็น"], ["Sound", "เสียง"], ["Smell", "กลิ่น"], ["Taste", "รสชาติ"], ["Touch", "สัมผัส"], ["Temperature", "อุณหภูมิ"])),
  tile("color", "Related Color", "สีที่เกี่ยวข้อง", opt(["Red", "แดง"], ["Blue", "น้ำเงิน"], ["Green", "เขียว"], ["Yellow", "เหลือง"], ["Black", "ดำ"], ["White", "ขาว"])),
  tile("size", "Size of the Object", "ขนาดของสิ่งของ", opt(["Tiny", "จิ๋ว"], ["Small", "เล็ก"], ["Hand-sized", "เท่าฝ่ามือ"], ["Medium", "กลาง"], ["Large", "ใหญ่"], ["Huge", "ใหญ่มาก"])),
  tile("material", "Material", "วัสดุ", opt(["Metal", "โลหะ"], ["Wood", "ไม้"], ["Plastic", "พลาสติก"], ["Paper", "กระดาษ"], ["Fabric", "ผ้า"], ["Glass", "แก้ว"])),
  tile("usage", "Everyday Use", "ใช้ในชีวิตประจำวัน", opt(["Kitchen", "ในครัว"], ["Work", "ในการทำงาน"], ["Hobby", "งานอดิเรก"], ["Medicine", "การแพทย์"], ["Cleaning", "ทำความสะอาด"], ["Rarely used", "แทบไม่ได้ใช้"])),
  tile("after", "After the Crime", "หลังก่อเหตุ", opt(["Fled at once", "หนีทันที"], ["Stayed calm", "อยู่ต่ออย่างสงบ"], ["Cleaned up", "เก็บกวาด"], ["Staged it", "จัดฉาก"], ["Called for help", "เรียกคนช่วย"], ["Left a sign", "ทิ้งสัญลักษณ์"])),
  tile("noise", "Noise Level", "ระดับเสียง", opt(["Silent", "เงียบสนิท"], ["Whisper", "เสียงกระซิบ"], ["Thud", "เสียงทึบ"], ["Bang", "เสียงดังปัง"], ["Scream", "เสียงกรีดร้อง"], ["Music", "เสียงเพลง"])),
  tile("planning", "Planning", "การวางแผน", opt(["Spontaneous", "ฉับพลัน"], ["Planned for days", "วางแผนหลายวัน"], ["Planned for years", "วางแผนหลายปี"], ["Copycat", "เลียนแบบ"], ["Rehearsed", "ซ้อมมาก่อน"], ["Improvised", "ด้นสด"])),
  tile("clue-feel", "Feel of the Evidence", "สัมผัสของหลักฐาน", opt(["Hard", "แข็ง"], ["Soft", "นุ่ม"], ["Sharp", "แหลมคม"], ["Sticky", "เหนียว"], ["Wet", "เปียก"], ["Light", "เบา"])),
  tile("value", "Value", "มูลค่า", opt(["Worthless", "ไร้ค่า"], ["Cheap", "ถูก"], ["Ordinary", "ธรรมดา"], ["Pricey", "แพง"], ["Precious", "ล้ำค่า"], ["Sentimental", "มีค่าทางใจ"])),
];

module.exports = { CS_MEANS, CS_CLUES, CS_CAUSE_TILE, CS_LOCATION_TILES, CS_SCENE_TILES };
