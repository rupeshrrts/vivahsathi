// Initial data for Vivah Saathi. Used only when data/db.json does not exist (or `npm run reset`).
// Default admin login (change it from Admin > Settings after first login):
//   Mobile: 9000000000   Password: Admin@123
// Demo customer login:
//   Mobile: 9876543210   Password: demo123

const BIHAR = ['Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur', 'Bhojpur', 'Buxar', 'Darbhanga', 'East Champaran (Motihari)', 'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad', 'Kaimur (Bhabua)', 'Katihar', 'Khagaria', 'Kishanganj', 'Lakhisarai', 'Madhepura', 'Madhubani', 'Munger', 'Muzaffarpur', 'Nalanda', 'Nawada', 'Patna', 'Purnia', 'Rohtas', 'Saharsa', 'Samastipur', 'Saran (Chhapra)', 'Sheikhpura', 'Sheohar', 'Sitamarhi', 'Siwan', 'Supaul', 'Vaishali', 'West Champaran (Bettiah)'];

const UP = ['Agra', 'Aligarh', 'Ambedkar Nagar', 'Amethi', 'Amroha', 'Auraiya', 'Ayodhya', 'Azamgarh', 'Baghpat', 'Bahraich', 'Ballia', 'Balrampur', 'Banda', 'Barabanki', 'Bareilly', 'Basti', 'Bhadohi', 'Bijnor', 'Budaun', 'Bulandshahr', 'Chandauli', 'Chitrakoot', 'Deoria', 'Etah', 'Etawah', 'Farrukhabad', 'Fatehpur', 'Firozabad', 'Gautam Buddha Nagar (Noida)', 'Ghaziabad', 'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur', 'Hapur', 'Hardoi', 'Hathras', 'Jalaun', 'Jaunpur', 'Jhansi', 'Kannauj', 'Kanpur Dehat', 'Kanpur Nagar', 'Kasganj', 'Kaushambi', 'Kushinagar', 'Lakhimpur Kheri', 'Lalitpur', 'Lucknow', 'Maharajganj', 'Mahoba', 'Mainpuri', 'Mathura', 'Mau', 'Meerut', 'Mirzapur', 'Moradabad', 'Muzaffarnagar', 'Pilibhit', 'Pratapgarh', 'Prayagraj', 'Raebareli', 'Rampur', 'Saharanpur', 'Sambhal', 'Sant Kabir Nagar', 'Shahjahanpur', 'Shamli', 'Shravasti', 'Siddharthnagar', 'Sitapur', 'Sonbhadra', 'Sultanpur', 'Unnao', 'Varanasi'];

const slug = s => s.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const CATEGORIES = [
  ['puja-samagri', 'Puja Samagri & Rasam Kits', 'पूजा सामग्री', '🪔', '#fff1d6'],
  ['pandit-ji', 'Pandit Ji Booking', 'पंडित जी', '🙏', '#ffe4d6'],
  ['mehndi-haldi', 'Mehndi & Haldi Events', 'मेहंदी हल्दी', '🌿', '#eef7dc'],
  ['mithai', 'Mithai & Sweets', 'मिठाई', '🍬', '#ffe0ec'],
  ['car-transport', 'Car, Bus & Baggi', 'गाड़ी बुकिंग', '🚗', '#dff1ff'],
  ['tent', 'Tent & Shamiyana', 'टेंट शामियाना', '⛺', '#e6f7e9'],
  ['band-dj', 'Band Baja & DJ', 'बैंड बाजा', '🥁', '#efe6ff'],
  ['catering', 'Halwai & Catering', 'हलवाई / भोज', '🍛', '#fff4e0'],
  ['decoration', 'Phool & Decoration', 'फूल सजावट', '💐', '#ffe6f0'],
  ['wedding-wear', 'Dulha-Dulhan Wear', 'दूल्हा दुल्हन', '👑', '#fff8d6'],
  ['gifts', 'Shagun & Gifts', 'शगुन उपहार', '🎁', '#e8f4ff'],
  ['photo-video', 'Photo & Video', 'फोटो वीडियो', '📸', '#eef0ff'],
  ['cards', 'Shaadi Cards', 'शादी कार्ड', '💌', '#ffeaea'],
];

// [cat, type, name, nameHi, price, mrp, unit, emoji, desc, includes[], featured, minQty]
const P = 'product', S = 'service';
const PRODUCTS = [
  // Puja samagri
  ['puja-samagri', P, 'Vivah Puja Samagri Complete Kit (51 items)', 'विवाह पूजा सामग्री किट', 2499, 3499, 'kit', '🪔', 'Everything Pandit Ji asks for on the wedding day, packed and labelled item-by-item. Prepared as per Bihar & UP vivah paddhati.', ['Kalash (tamba) with nariyal', 'Roli, kumkum, haldi, akshat', 'Janeu (2 pair), mauli / kalawa', 'Supari, laung, elaichi, panchmeva', 'Havan samagri 1 kg + aam ki lakdi', 'Ghee 500 g, kapoor, dhoop, agarbatti', 'Gangajal, panchamrit samagri', 'Peela kapda, lal kapda, chunri'], true],
  ['puja-samagri', P, 'Haldi Rasam Kit', 'हल्दी रस्म किट', 699, 899, 'kit', '🌼', 'Haldi-ubtan rasam kit for dulha / dulhan with fresh-ground haldi and aam patta.', ['Kachchi haldi paste 500 g', 'Ubtan (besan, chandan, gulab jal)', 'Aam ke patte & dubh ghaas', 'Peela kapda 2.5 m', 'Mitti ka kalash & diya'], true],
  ['puja-samagri', P, 'Tilak Ceremony Kit (Tilak / Chheka)', 'तिलक समारोह किट', 1499, 1999, 'kit', '🥥', 'Complete tilak thali set for the tilak / chheka ceremony at the groom\'s house.', ['Decorated tilak thali', 'Roli, chandan, akshat', 'Nariyal with chunri', 'Janeu, supari, paan', 'Mithai dabba (1 kg)', 'Shagun lifafa (11 pcs)'], true],
  ['puja-samagri', P, 'Sindoordaan Kit', 'सिंदूरदान किट', 899, 1199, 'kit', '🔴', 'Sindoordaan rasam set with designer sindoor-dani and laal chunri.', ['Wooden sindoor-dani (sindhora)', 'Pure sindoor 100 g', 'Laal chunri / odhni', 'Bichhiya (silver plated)', 'Mangalsutra box'], false],
  ['puja-samagri', P, 'Kohbar & Mandap Puja Kit', 'कोहबर व मंडप किट', 1999, 2599, 'kit', '🏺', 'Kohbar ghar and mandap sthapana kit — Mithila & Bhojpuri style.', ['Kohbar painting sheet (Madhubani)', 'Mandap kalash set (5 pcs)', 'Aam patta toran', 'Mitti ke diye (51)', 'Bamboo & kush ghaas'], true],
  ['puja-samagri', P, 'Matkor (Mati Puja) Kit', 'मटकोर किट', 549, 749, 'kit', '🪴', 'For the Matkor / Mati-kodwa rasam done by the women of the family.', ['Kudal (decorated)', 'Mitti ka kalash & dakkan', 'Haldi, sindoor, akshat', 'Peela kapda', 'Paan & supari'], false],
  ['puja-samagri', P, 'Dala-Dauri Bamboo Basket Set', 'डाला-दउरा सेट', 799, 999, 'set of 7', '🧺', 'Handmade bamboo dala, dauri and supali set used in Bihar & Purvanchal weddings.', ['2 big dala', '2 dauri', '2 supali', '1 painted pitari'], false],
  ['puja-samagri', P, 'Havan Samagri & Aam Lakdi Pack', 'हवन सामग्री व लकड़ी', 449, 599, 'pack', '🔥', 'Pure havan samagri with dry mango wood for vivah havan.', ['Havan samagri 1 kg', 'Aam ki lakdi 5 kg', 'Kapoor 50 g', 'Ghee 250 g'], false],
  ['puja-samagri', P, 'Lava (Khil) & Lava Parchhan Set', 'लावा परछन सेट', 299, 399, 'set', '🌾', 'Dhaan ka lava with decorated soop for the lava-parchhan rasam.', ['Lava (khil) 1 kg', 'Decorated soop', 'Mitti ka diya (5)', 'Akshat & phool'], false],

  // Pandit ji
  ['pandit-ji', S, 'Vivah Sanskar – Pandit Ji (Full Ceremony)', 'विवाह संस्कार पंडित जी', 11000, 15000, 'ceremony', '🙏', 'Pandit Ji for every rasam of the shaadi: tilak, haldi, matkor and the full vivah ceremony (dwar puja, kanyadaan, saat phere, sindoordaan) - you give the date of each rasam. 2 pandits included. Local Pandit Ji of your district is assigned.', ['2 experienced pandits', 'Dwar puja to vidai', 'Muhurat check included', 'Bhojpuri / Maithili / Awadhi / Hindi'], true],
  ['pandit-ji', S, 'Tilak / Chheka Puja Pandit Ji', 'तिलक पूजा पंडित जी', 3100, 4100, 'ceremony', '📿', 'Pandit Ji for tilak / chheka / roka ceremony at groom\'s or bride\'s place.', ['1 pandit', 'Puja duration 2–3 hrs', 'Samagri list shared in advance'], true],
  ['pandit-ji', S, 'Haldi & Matkor Puja Pandit Ji', 'हल्दी मटकोर पूजा', 2100, 2700, 'ceremony', '🌼', 'Pandit Ji for haldi, matkor and mandap sthapana puja.', ['1 pandit', 'Mandap sthapana', 'Kalash sthapana'], false],
  ['pandit-ji', S, 'Satyanarayan Katha', 'सत्यनारायण कथा', 2100, 2500, 'puja', '🕉️', 'Satyanarayan katha after marriage / griha pravesh by a vidwan Pandit Ji.', ['1 pandit', 'Katha + havan + aarti'], false],
  ['pandit-ji', S, 'Kundli Milan (Guna Milan)', 'कुंडली मिलान', 501, 1100, 'report', '⭐', 'Detailed kundli matching with 36 guna milan, manglik dosh check and remedies.', ['Written report', 'Phone consultation 20 min'], true],
  ['pandit-ji', S, 'Shubh Vivah Muhurat Consultation', 'शुभ विवाह मुहूर्त', 251, 501, 'consultation', '📅', 'Get shubh lagan / vivah muhurat dates as per panchang for both families.', ['3 best dates', 'Lagan time for each date'], false],

  // Mithai
  ['mithai', P, 'Silao Khaja (Nalanda Special)', 'सिलाव का खाजा', 480, 560, 'kg', '🥐', 'Famous layered khaja from Silao, Nalanda — a must in every Bihar shaadi.', ['Fresh, packed in mithai dabba'], true, 1],
  ['mithai', P, 'Motichoor Laddoo (Desi Ghee)', 'मोतीचूर लड्डू', 440, 520, 'kg', '🟠', 'Pure desi ghee motichoor laddoo for tilak, shagun and vidai.', ['Desi ghee', 'Kesar & elaichi'], true, 1],
  ['mithai', P, 'Gaya Tilkut', 'गया का तिलकुट', 400, 480, 'kg', '🍪', 'Crispy til-gur tilkut from Gaya.', ['Khoya / gur / chini variants on request'], false, 1],
  ['mithai', P, 'Mathura Peda', 'मथुरा पेड़ा', 560, 640, 'kg', '🟤', 'Traditional browned-khoya peda from Mathura.', ['Pure khoya'], true, 1],
  ['mithai', P, 'Agra Petha (Assorted)', 'आगरा पेठा', 320, 380, 'kg', '🧊', 'Assorted Agra petha — sada, kesar, angoori and paan.', ['4 flavours'], false, 1],
  ['mithai', P, 'Anarsa (Bihar Special)', 'अनरसा', 500, 580, 'kg', '🍘', 'Crispy chawal-gur anarsa with til — a Bihar wedding favourite.', [], false, 1],
  ['mithai', P, 'Rasgulla Tin (1 kg)', 'रसगुल्ला', 300, 360, 'tin', '⚪', 'Soft spongy rasgulla, sealed tin.', ['~20 pieces'], false, 1],
  ['mithai', P, 'Kaju Katli (Premium)', 'काजू कतली', 1100, 1300, 'kg', '💠', 'Premium kaju katli with chandi vark.', [], false, 1],
  ['mithai', P, 'Thekua (Gur & Ghee)', 'ठेकुआ', 350, 420, 'kg', '🍪', 'Home-style thekua, for kheer-khilai and vidai packing.', [], false, 1],
  ['mithai', P, 'Shagun Mithai Boxes (Pack of 25)', 'शगुन मिठाई डिब्बे', 4999, 5999, 'pack of 25', '🎁', '25 decorated 500 g mithai boxes for relatives — mix of laddoo, peda and khaja.', ['25 × 500 g boxes', 'Printed shagun sleeve with your names'], true],

  // Car & transport
  ['car-transport', S, 'Decorated Doli Car – Sedan', 'सजी हुई डोली कार', 5500, 7000, 'day', '🚗', 'AC sedan with fresh flower decoration for dulha / vidai. Driver & fuel up to 100 km included.', ['AC sedan + driver', 'Flower decoration', '100 km / 12 hrs'], true],
  ['car-transport', S, 'Decorated SUV for Dulha', 'दूल्हा एसयूवी', 8500, 10500, 'day', '🚙', '7-seater SUV with decoration for baraat or vidai.', ['7-seater + driver', 'Flower decoration', '150 km / 12 hrs'], false],
  ['car-transport', S, 'Luxury Car for Dulha', 'लग्जरी कार', 18000, 22000, 'day', '🏎️', 'Premium luxury sedan with designer flower decoration.', ['Luxury sedan + chauffeur', 'Designer decoration', '80 km / 8 hrs'], true],
  ['car-transport', S, 'Vintage Open Car', 'विंटेज कार', 21000, 25000, 'event', '🚘', 'Classic vintage open car for the grand dulha entry.', ['3 hrs', 'Decoration included'], false],
  ['car-transport', S, 'Tempo Traveller (12 seater)', 'टेम्पो ट्रैवलर', 4500, 5500, 'day', '🚐', 'AC tempo traveller for baraat / relatives.', ['12 seats + driver', '250 km / day'], false],
  ['car-transport', S, 'Baraat Bus (52 seater)', 'बारात बस', 12000, 14500, 'day', '🚌', 'Comfortable 2x2 bus for baraat.', ['52 seats + driver', '300 km / day', 'Music system'], true],
  ['car-transport', S, 'Ghodi for Dulha', 'दूल्हे की घोड़ी', 5100, 6500, 'event', '🐎', 'Decorated white ghodi with handler for baraat nikasi.', ['Decorated ghodi', 'Handler', '3 hrs'], true],
  ['car-transport', S, 'Royal Baggi (Buggy)', 'शाही बग्गी', 15000, 18000, 'event', '🐴', 'Royal baggi with 2 horses and lights for baraat.', ['2 horses', 'Lights', '3 hrs'], false],

  // Tent
  ['tent', S, 'Shamiyana (40×60 ft) with Darri & Carpet', 'शामियाना', 15000, 18500, 'day', '⛺', 'Traditional shamiyana with qanat, darri and red carpet — set up at your house or ground.', ['40×60 ft shamiyana', 'Qanat on 3 sides', 'Darri + red carpet', 'Setup & removal'], true],
  ['tent', S, 'German Hangar Tent (per 1000 sq ft)', 'जर्मन हैंगर टेंट', 9000, 11000, '1000 sq ft', '🏕️', 'Waterproof aluminium-frame hangar, safe for any weather.', ['Waterproof', 'Flooring extra'], false],
  ['tent', S, 'Vivah Mandap with Decoration', 'विवाह मंडप', 12000, 15000, 'event', '🛕', 'Traditional mandap with bamboo, kalash, phool and lights.', ['Bamboo mandap', 'Genda phool & aam patta', 'Lighting'], true],
  ['tent', S, 'Jaimala Stage', 'जयमाला स्टेज', 18000, 22000, 'event', '💒', 'Designer jaimala stage with sofa, backdrop and lights.', ['Stage 16×12 ft', 'Royal sofa', 'Flower backdrop', 'Focus lights'], true],
  ['tent', S, 'Chairs with Covers (100 pcs)', 'कुर्सियां (100)', 1500, 2000, '100 pcs', '🪑', 'Plastic chairs with white / red covers.', ['100 chairs', 'Covers & bows'], false],
  ['tent', S, 'Jhalar Lighting Package', 'लाइटिंग पैकेज', 7000, 9000, 'event', '💡', 'House jhalar lights, halogen and entry gate lights.', ['200 m jhalar', '10 halogens', 'Electrician on duty'], false],
  ['tent', S, 'Generator 25 kVA (Silent)', 'जनरेटर', 6500, 8000, 'day', '⚡', 'Silent DG set with diesel for 8 hrs and operator.', ['25 kVA', 'Diesel 8 hrs', 'Operator'], false],
  ['tent', S, 'Cooler & Fan Set (10 pcs)', 'कूलर / पंखा', 2500, 3200, '10 pcs', '🌀', 'Pedestal fans / desert coolers for summer weddings.', [], false],

  // Band DJ
  ['band-dj', S, 'Band Party (21 members)', 'बैंड पार्टी', 31000, 38000, 'baraat', '🎺', 'Full band party with uniform, band master and singer for baraat.', ['21 members', 'Singer', '3 hrs baraat'], true],
  ['band-dj', S, 'DJ with Sound & Lights', 'डीजे', 15000, 19000, 'night', '🎧', 'DJ with 4 tops + 4 bass, light effects and Bhojpuri / Bollywood playlist.', ['4+4 speakers', 'Sharpy & LED lights', '6 hrs'], true],
  ['band-dj', S, 'Shehnai Vadak', 'शहनाई वादक', 5100, 6500, 'event', '🎶', 'Traditional shehnai party for dwar puja and vidai.', ['3 artists'], false],
  ['band-dj', S, 'Dhol Tasha Group', 'ढोल ताशा', 7500, 9000, 'event', '🥁', 'Energetic dhol-tasha group for baraat and haldi.', ['6 artists'], false],
  ['band-dj', S, 'Roshni (Light Carriers, 20)', 'रोशनी', 6000, 7500, 'baraat', '🏮', 'Traditional roshni / gas-light carriers for baraat procession.', ['20 carriers', 'Generator trolley'], false],

  // Catering
  ['catering', S, 'Veg Bhoj Thali', 'शाकाहारी भोज', 350, 420, 'plate', '🍛', 'Puri, 2 sabzi, pulao, dal, raita, chutney, papad, 1 mithai. Minimum 100 plates.', ['Serving staff included', 'Pattal-dona or plates'], true, 100],
  ['catering', S, 'Premium Wedding Buffet', 'प्रीमियम बुफे', 650, 800, 'plate', '🥘', 'Starters, paneer dishes, naan, biryani, 3 sweets, ice-cream, chaat. Minimum 100 plates.', ['Live counters', 'Uniformed staff', 'Crockery'], true, 100],
  ['catering', S, 'Halwai Team Booking (you give ration)', 'हलवाई बुकिंग', 15000, 18000, 'day', '👨‍🍳', 'Experienced halwai with 6 helpers and bhatti. You provide ration — we provide the cooking.', ['Head halwai + 6 helpers', 'Bhatti & bartan'], false],
  ['catering', S, 'Chaat & Golgappa Counter', 'चाट काउंटर', 6000, 7500, 'event', '🥟', 'Golgappa, aloo tikki and papdi chaat counter for 200 guests.', [], false],
  ['catering', S, 'Paan Counter', 'पान काउंटर', 3500, 4500, 'event', '🌿', 'Banarasi / Maghai paan counter with paanwala.', ['500 paan'], false],
  ['catering', S, 'Tea, Coffee & Kulhad Stall', 'चाय कॉफी स्टॉल', 2500, 3200, 'event', '☕', 'Kulhad chai and coffee stall for 300 cups.', [], false],

  // Decoration
  ['decoration', P, 'Genda Phool Mala (100 pcs)', 'गेंदा फूल माला', 1200, 1500, '100 pcs', '🌼', 'Fresh genda (marigold) mala, 5 ft each — delivered on morning of the event.', [], true],
  ['decoration', P, 'Jaimala Pair (Rose & Rajnigandha)', 'जयमाला जोड़ी', 1500, 1900, 'pair', '💐', 'Designer fresh flower jaimala pair.', [], true],
  ['decoration', P, 'Fresh Rose Petals (5 kg)', 'गुलाब पंखुड़ी', 1800, 2200, '5 kg', '🌹', 'For dwar swagat and phoolon ki barsaat.', [], false],
  ['decoration', S, 'Doli Car Flower Decoration', 'कार सजावट', 3500, 4500, 'car', '🌸', 'Fresh flower decoration on your own car.', [], false],
  ['decoration', S, 'Gate & Entrance Decoration', 'गेट सजावट', 9000, 11000, 'event', '🎪', 'Flower + cloth decoration for main gate and entry path.', [], false],
  ['decoration', S, 'Kohbar Ghar Decoration', 'कोहबर सजावट', 4500, 5500, 'room', '🛏️', 'Kohbar room decoration with phool, Madhubani art and lights.', [], false],

  // Wedding wear
  ['wedding-wear', P, 'Dulha Maur (Bihar Style)', 'दूल्हे का मौर', 1100, 1400, 'piece', '👑', 'Traditional handmade sola / khajur maur for dulha.', [], true],
  ['wedding-wear', P, 'Banarasi Silk Saree', 'बनारसी साड़ी', 6500, 8500, 'piece', '🥻', 'Pure Banarasi katan silk saree with zari border, from Varanasi weavers.', ['Blouse piece included'], true],
  ['wedding-wear', P, 'Bridal Lehenga', 'दुल्हन लहंगा', 14999, 19999, 'set', '👗', 'Heavy embroidered bridal lehenga with dupatta.', ['Lehenga, choli, dupatta', 'Alteration support'], false],
  ['wedding-wear', S, 'Sherwani on Rent', 'शेरवानी किराए पर', 3500, 4500, '3 days', '🤵', 'Designer sherwani with safa, mala and mojari on rent for 3 days.', ['Sherwani', 'Safa', 'Mala', 'Mojari'], false],
  ['wedding-wear', P, 'Safa / Pagdi Set (10 pcs)', 'साफा पगड़ी', 2500, 3200, '10 pcs', '🎩', 'Ready-to-wear safa for baraatis in matching colour.', [], false],
  ['wedding-wear', P, 'Peeli Dhoti-Kurta Set (Rasam)', 'पीली धोती कुर्ता', 799, 999, 'set', '🧣', 'Peela dhoti-kurta for haldi and vivah rasam.', [], false],

  // Gifts
  ['gifts', P, 'Dry Fruit Gift Boxes (Set of 10)', 'ड्राई फ्रूट बॉक्स', 4999, 6200, 'set of 10', '🥜', '10 decorated boxes with kaju, badam, kishmish, akhrot (250 g each).', [], true],
  ['gifts', P, 'Shagun Lifafa (Pack of 50)', 'शगुन लिफाफा', 299, 399, 'pack of 50', '🧧', 'Designer shagun envelopes with ₹1 coin slot.', [], false],
  ['gifts', P, 'Steel Bartan Gift Set', 'स्टील बर्तन सेट', 3499, 4299, 'set', '🍽️', '51-piece stainless steel dinner set for gifting.', [], false],
  ['gifts', P, 'Silver Plated Puja Thali', 'पूजा थाली', 1499, 1899, 'piece', '🪙', 'Silver-plated puja thali with diya, kalash and bowls.', [], false],
  ['gifts', P, 'Return Gift Potli (Pack of 50)', 'रिटर्न गिफ्ट पोटली', 2499, 2999, 'pack of 50', '👝', 'Embroidered potli bags with mishri-elaichi.', [], false],

  // Photo
  ['photo-video', S, 'Traditional Photo + Video', 'फोटो + वीडियो', 25000, 30000, 'wedding', '📷', '1 photographer + 1 videographer for tilak, haldi and wedding day. Album included.', ['300+ edited photos', 'Full HD video', '1 album (40 sheets)'], true],
  ['photo-video', S, 'Candid + Cinematic Film', 'सिनेमैटिक वीडियो', 55000, 65000, 'wedding', '🎬', 'Candid photography and cinematic highlight film.', ['2 days', 'Highlight reel', 'Pen drive + online gallery'], false],
  ['photo-video', S, 'Drone Shoot', 'ड्रोन शूट', 8000, 10000, 'event', '🚁', 'Aerial drone coverage of baraat and venue.', [], false],
  ['photo-video', S, 'Pre-Wedding Shoot', 'प्री-वेडिंग शूट', 20000, 25000, 'shoot', '💑', 'Pre-wedding shoot at 2 locations in your city.', [], false],

  // Cards
  ['cards', P, 'Traditional Shaadi Card (100 pcs)', 'शादी कार्ड', 2500, 3200, '100 pcs', '💌', 'Hindi / English printed cards with Ganesh ji design and envelope.', ['Free design proof on WhatsApp'], true],
  ['cards', P, 'Premium Box Invitation (50 pcs)', 'प्रीमियम निमंत्रण', 7500, 9000, '50 pcs', '📦', 'Premium box invitation with mithai / dry fruit space.', [], false],
  ['cards', S, 'Video E-Invite for WhatsApp', 'वीडियो ई-इनवाइट', 1500, 2000, 'video', '📱', 'Animated wedding invitation video for WhatsApp, in Hindi / Bhojpuri.', ['2 revisions'], false],

  // Mehndi & Haldi events (added later, keep at the end so ids stay stable)
  ['mehndi-haldi', S, 'Bridal Mehndi Artist (Hands & Feet)', 'दुल्हन मेहंदी आर्टिस्ट', 5100, 6500, 'bride', '🌿', 'Experienced mehndi artist for the dulhan — full hands up to elbow and feet, with dulha\'s name hidden in the design.', ['Natural organic mehndi', 'Full hands + feet', '4–5 hrs'], true],
  ['mehndi-haldi', S, 'Mehndi for Guests (10 guests)', 'मेहमानों की मेहंदी', 1500, 2000, '10 guests', '✋', 'Simple & quick designs for family and guests at the mehndi ceremony. Book multiple for more guests.', ['Both hands, one side', '2 artists'], false],
  ['mehndi-haldi', S, 'Mehndi Ceremony Decoration', 'मेहंदी सजावट', 12000, 15000, 'event', '🌺', 'Green & pink theme mehndi decoration with floor seating, gaddi, umbrellas, phool and photo corner.', ['Backdrop + gaddi seating', 'Phool & umbrellas', 'Lights'], true],
  ['mehndi-haldi', S, 'Haldi Ceremony Decoration', 'हल्दी सजावट', 10000, 13000, 'event', '💛', 'Yellow theme haldi setup with genda phool backdrop, chowki, and haldi bowls.', ['Genda backdrop', 'Chowki & seating', 'Haldi bowls & urli'], true],
  ['mehndi-haldi', P, 'Phoolon ke Gehne (Flower Jewellery Set)', 'फूलों के गहने', 1499, 1999, 'set', '🌼', 'Fresh flower jewellery for dulhan at haldi / mehndi — necklace, earrings, mang tikka and bracelets.', ['5-piece set', 'Delivered fresh on event morning'], false],
  ['photo-video', S, 'Event Photographer (Haldi / Mehndi / Tilak)', 'इवेंट फोटोग्राफर', 7500, 9000, 'event (4 hrs)', '📷', 'Photographer for a single event — haldi, mehndi, tilak, sangeet or reception. Choose the event while booking.', ['4 hours', '150+ edited photos', 'Online gallery'], true],
  ['mehndi-haldi', P, 'Natural Mehndi Cones (Pack of 24)', 'मेहंदी कोन', 480, 600, 'pack', '🌿', 'Chemical-free natural mehndi cones for dark colour.', [], false],
  ['decoration', S, 'Event Flower Decoration (per event)', 'इवेंट फूल सजावट', 15000, 18000, 'event', '💐', 'Fresh flower stage, entry and aisle decoration for any event — tilak, haldi, mehndi, shaadi or reception.', ['Stage flowers', 'Entry gate', 'Aisle & tables'], true],

  // Tent decoration bookings
  ['tent', S, 'Royal Red & Gold Tent Decoration', 'शाही टेंट सजावट', 45000, 55000, 'event', '👑', 'Complete tent decoration in royal red & gold — flower-and-drape stage, maharaja chairs, carpet, ceiling drapes and entry. Up to 500 guests.', ['Stage with flower backdrop', 'Ceiling & side drapes', 'Royal sofa + 10 maharaja chairs', 'Red carpet & entry gate', 'Setup a day before'], true],
  ['tent', S, 'White Drape Reception Tent Decoration', 'सफेद ड्रेप टेंट सजावट', 38000, 46000, 'event', '🤍', 'Elegant white drape tent with round tables, chair covers, chandeliers and warm lighting — ideal for reception.', ['White ceiling & wall drapes', '20 round tables with covers', 'Chandeliers', 'Warm lighting'], true],
  ['tent', S, 'Canopy & Fairy-Light Lawn Decoration', 'कैनोपी लॉन सजावट', 32000, 40000, 'event', '✨', 'Open-air lawn setup with draped canopies, fairy lights and dining tables — perfect for mehndi, sangeet or reception.', ['Draped canopies', 'Fairy-light ceiling', 'Dining tables & chairs'], false],
  ['tent', S, 'Fairy-Light Pathway & Aisle Decoration', 'लाइट पाथवे सजावट', 14000, 18000, 'event', '🌟', 'Fairy-light pathway with flower aisle from gate to stage.', ['Pathway lights', 'Flower aisle', 'Entry arch'], false],
  ['tent', S, 'Chandelier Premium Tent Decoration', 'झूमर प्रीमियम टेंट', 60000, 75000, 'event', '💎', 'Premium tent with crystal chandeliers, greenery, gold chairs and designer table settings. Up to 600 guests.', ['10 crystal chandeliers', 'Gold chiavari chairs', 'Greenery & florals', 'Designer tables'], true],
  ['tent', S, 'Wedding Stage & Sofa Decoration', 'स्टेज व सोफा सजावट', 22000, 27000, 'event', '🛋️', 'Flower stage with drapes, royal sofa and side chairs for jaimala / reception.', ['Stage 20×12 ft', 'Flower & drape backdrop', 'Royal sofa set'], false],
];

// How many bookings each service can take on one date (0 = unlimited). Admin can change it per product.
const DAILY_CAPACITY = {
  p_010: 6, p_011: 6, p_012: 6, p_013: 8, p_028: 2, p_029: 1, p_032: 3, p_033: 1, p_036: 4, p_037: 3, p_042: 2, p_043: 4,
  p_070: 3, p_071: 2, p_072: 2, p_077: 3, p_079: 3, p_080: 3, p_082: 4, p_084: 3,
  p_085: 2, p_086: 2, p_087: 2, p_088: 3, p_089: 1, p_090: 3,
};

// Which event a booking is usually for (customer can change it while booking)
const DEFAULT_EVENT = {
  p_010: 'Shaadi (Vivah)', p_011: 'Tilak / Chheka', p_012: 'Haldi', p_026: 'Baraat', p_028: 'Baraat', p_029: 'Baraat', p_031: 'Baraat', p_032: 'Baraat', p_033: 'Baraat',
  p_042: 'Baraat', p_043: 'Sangeet', p_045: 'Baraat', p_046: 'Baraat', p_037: 'Shaadi (Vivah)', p_077: 'Mehndi', p_078: 'Mehndi', p_079: 'Mehndi', p_080: 'Haldi', p_082: 'Haldi', p_086: 'Reception', p_087: 'Sangeet',
};

// Sample photos (free Unsplash licence, hot-linked). Admin can replace any of them with real shop photos.
const photo = (id, w = 600, h = w) => `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=70`;
const PRODUCT_PHOTOS = {
  p_001: '1783255166346-b7c82195ba34', p_002: '1670774837214-21b88943a6bb', p_003: '1761295908789-42feef309297', p_004: '1610047614301-13c63f00c032',
  p_005: '1790808415654-7fe3692eb993', p_006: '1786822550756-4a5c22ef131c', p_007: '1635719918971-bf907c2b1281', p_008: '1630764883473-e8c2056f0589', p_009: '1577083753695-e010191bacb5',
  p_010: '1741201864879-c5e7f81c98b0', p_011: '1754782915842-aa4fca6c203a', p_012: '1681717166573-f71589207785', p_013: '1764135264848-c1cbff661b50',
  p_014: '1777732341528-782603ab6871', p_015: '1692107112697-aca539554bc0',
  p_016: '1695568181440-aca4dac18650', p_017: '1695568181747-f54dff1d4654', p_018: '1695568179778-822432650f94', p_019: '1695568181363-af5c78f4d059',
  p_020: '1695568181558-034b7d3e49eb', p_021: '1695568180070-8b5acead5cf4', p_022: '1714799263412-2e0c1f875959', p_023: '1699708263762-00ca477760bd',
  p_024: '1760263217152-009971f0bccc', p_025: '1758910536889-43ce7b3199fd',
  p_026: '1760110885805-273b5bf5e50b', p_027: '1769115820298-d235e3ef6edd', p_028: '1790845160661-f04a7c11c13f', p_029: '1561100966-f6aa0145e8e6',
  p_030: '1549194898-60fd030ecc0f', p_031: '1570125909517-53cb21c89ff2', p_032: '1588772740477-12d752619e8e', p_033: '1781077128735-ee92e7377d78',
  p_034: '1744891470493-44321ef136a2', p_035: '1675376616537-c8aa9ddc9977', p_036: '1587271636175-90d58cdad458', p_037: '1745573673416-66e829644ae9',
  p_038: '1707333514312-39cf7658479c', p_039: '1513625047154-f390b1b0df20', p_040: '1780445392484-38a4852a1fd8', p_041: '1601084195907-44baaa49dabd',
  p_042: '1774438464558-a3f4c6aad0a5', p_043: '1470225620780-dba8ba36b745', p_044: '1774438029056-9c60141da1e4', p_045: '1774438360852-92c4aba88cb6', p_046: '1646297646167-c46f8d07b650',
  p_047: '1742281257687-092746ad6021', p_048: '1649140041688-0f75446e707e', p_049: '1721174233280-c55186b7cabc', p_050: '1781243680771-1fea4521e196',
  p_051: '1786891925669-8dad23187806', p_052: '1630748662359-40a2105640c7',
  p_053: '1789971649652-ae5dfeeaa7b4', p_054: '1788357928572-adbdfa7f8613', p_055: '1762328845997-c1fc8519b2e2', p_056: '1571113908007-5d6aae13d73e',
  p_057: '1790808415655-7633deb022d2', p_058: '1589463349208-95817c91f971',
  p_059: '1759906766080-82b785c61f51', p_060: '1617627143750-d86bc21e42bb', p_061: '1610173827043-9db50e0d8ef9', p_062: '1760080838961-4208536db385',
  p_063: '1785613590152-63d713bc94b4', p_064: '1701365676249-9d7ab5022dec',
  p_065: '1710857397974-f0617001c39e', p_066: '1592781959445-63e59ba0666d', p_067: '1586969593928-1c87c1f9c2ef', p_068: '1692107112697-aca539554bc0',
  p_069: '1647221598398-934ed5cb0e4f',
  p_070: '1611550287705-7ff8b459c8eb', p_071: '1629756048377-09540f52caa1', p_072: '1473968512647-3e447244af8f', p_073: '1630526720753-aa4e71acf67d',
  p_074: '1633037773384-27d7ac0491e7', p_075: '1632610992723-82d7c212f6d7', p_076: '1509316554658-04f9287cdb78',
  p_077: '1730003873829-09b4b16444c1', p_078: '1505932794465-147d1f1b2c97', p_079: '1771992226177-759e116e72f4', p_080: '1789971649660-eefc756ee5dd',
  p_081: '1770748034147-6e6891e1098a', p_082: '1722952934708-749c22eb2e58', p_083: '1764640848891-9b23d3632ccf', p_084: '1772127822552-ce9ef537bdcf',
  p_085: '1745573673583-a51f665ae48e', p_086: '1775476793931-cb484f197760', p_087: '1772127822525-7eda37383b9f', p_088: '1607861884586-c7cfaed16290',
  p_089: '1723832348105-2e69f948135a', p_090: '1605553426886-c0a99033fda0',
};
// Photos fixed later: product id → the old seed photo id it replaces ('' = had no photo). The one-time photo
// upgrade in server.js swaps a photo only while it is still empty or this old one (admin uploads are kept).
const OLD_PRODUCT_PHOTOS = {
  p_007: '', p_040: '', p_041: '', p_046: '', p_051: '',
  p_018: '1635952346904-95f2ccfcd029', p_022: '1765188988267-7018a757f1f3', p_030: '1759882608768-168d4c3a91c2', // tilkut, rasgulla, tempo traveller
  p_064: '1681717075175-19feb7a6f664', p_066: '1513201099705-a9746e1e201f', p_068: '1680993032090-1ef7ea9b51e5', // dhoti-kurta, lifafa, puja thali (was a food thali)
};
const CATEGORY_PHOTOS = {
  'puja-samagri': '1783255166346-b7c82195ba34', 'pandit-ji': '1741201864879-c5e7f81c98b0', mithai: '1695568181747-f54dff1d4654', 'mehndi-haldi': '1771992226177-759e116e72f4',
  'car-transport': '1790845160661-f04a7c11c13f', tent: '1744891470493-44321ef136a2', 'band-dj': '1774438464558-a3f4c6aad0a5',
  catering: '1742281257687-092746ad6021', decoration: '1789971649652-ae5dfeeaa7b4', 'wedding-wear': '1610173827043-9db50e0d8ef9',
  gifts: '1710857397974-f0617001c39e', 'photo-video': '1611550287705-7ff8b459c8eb', cards: '1633037773384-27d7ac0491e7',
};
const BANNER_PHOTOS = ['1587271636175-90d58cdad458', '1741201864879-c5e7f81c98b0', '1758910536889-43ce7b3199fd', '1744891470493-44321ef136a2'];

// Ready-made packages: one click adds every item to the cart
const PACKAGES = [
  ['pk-tilak', 'Tilak / Chheka Package', 'तिलक पैकेज', '1754782915842-aa4fca6c203a', 'Tilak kit, Pandit Ji, 5 kg laddoo and genda mala — everything for the tilak ceremony.', [['p_003', 1], ['p_011', 1], ['p_017', 5], ['p_053', 1]]],
  ['pk-haldi', 'Haldi & Matkor Package', 'हल्दी मटकोर पैकेज', '1681717166573-f71589207785', 'Haldi kit, matkor kit, Pandit Ji, peeli dhoti-kurta and phool mala.', [['p_002', 1], ['p_006', 1], ['p_012', 1], ['p_064', 1], ['p_053', 1]]],
  ['pk-vivah', 'Ghar ki Shaadi – Vivah Package', 'विवाह पैकेज', '1587271636175-90d58cdad458', 'Puja samagri, Pandit Ji, mandap, shamiyana, kohbar kit, havan and jaimala — the full wedding-day setup at home.', [['p_001', 1], ['p_010', 1], ['p_005', 1], ['p_008', 1], ['p_036', 1], ['p_034', 1], ['p_054', 1]]],
  ['pk-tent', 'Tent & Decoration Package', 'टेंट सजावट पैकेज', '1745573673583-a51f665ae48e', 'Shamiyana, royal tent decoration, light pathway, 300 chairs, jhalar lighting and generator.', [['p_034', 1], ['p_085', 1], ['p_088', 1], ['p_038', 3], ['p_039', 1], ['p_040', 1]]],
  ['pk-baraat', 'Baraat Package', 'बारात पैकेज', '1781077128735-ee92e7377d78', 'Ghodi, band party, DJ, decorated doli car and baraat bus.', [['p_032', 1], ['p_042', 1], ['p_043', 1], ['p_026', 1], ['p_031', 1]]],
  ['pk-bhoj', 'Shaadi Bhoj Package (200 guests)', 'भोज पैकेज', '1742281257687-092746ad6021', 'Veg bhoj for 200, chaat counter, paan counter and tea stall.', [['p_047', 200], ['p_050', 1], ['p_051', 1], ['p_052', 1]]],
  ['pk-mehndi', 'Mehndi Raat Package', 'मेहंदी रात पैकेज', '1771992226177-759e116e72f4', 'Bridal mehndi artist, mehndi for 30 guests, mehndi decoration, flower jewellery and an event photographer.', [['p_077', 1], ['p_078', 3], ['p_079', 1], ['p_081', 1], ['p_082', 1]]],
  ['pk-mithai', 'Mithai & Vidai Package', 'मिठाई विदाई पैकेज', '1758910536889-43ce7b3199fd', '25 shagun mithai boxes, 5 kg khaja, 3 kg thekua, dry fruit boxes and shagun lifafa.', [['p_025', 1], ['p_016', 5], ['p_024', 3], ['p_065', 1], ['p_066', 1]]],
];

// services meant for one rasam only (Pandit Ji pujas); everything else can be booked for any function
const SERVICE_EVENTS = { p_011: ['Tilak / Chheka'] };
// one booking covers these rasams, each on the date the customer gives
const SERVICE_COVERS = { p_010: ['Tilak / Chheka', 'Haldi', 'Matkor', 'Shaadi (Vivah)'], p_012: ['Haldi', 'Matkor'] };
function buildSeed(hashPassword) {
  const districts = [
    ...BIHAR.map(n => ({ id: 'br-' + slug(n), name: n, state: 'Bihar', active: true, extraCharge: 0 })),
    ...UP.map(n => ({ id: 'up-' + slug(n), name: n, state: 'Uttar Pradesh', active: true, extraCharge: 0 })),
  ];
  const categories = CATEGORIES.map(([id, name, nameHi, emoji, color], i) => ({ id, name, nameHi, emoji, color, image: CATEGORY_PHOTOS[id] ? photo(CATEGORY_PHOTOS[id], 300) : '', order: i + 1, active: true }));
  const created = new Date().toISOString();
  const products = PRODUCTS.map(([cat, type, name, nameHi, price, mrp, unit, emoji, desc, includes, featured, minQty], i) => {
    const id = 'p_' + String(i + 1).padStart(3, '0');
    // sample prices only: MRP = price (no made-up "MRP" or discount) and no star ratings —
    // the admin enters a real printed MRP where one exists
    return {
      id, cat, type, name, nameHi, price, mrp: price, unit, emoji, image: PRODUCT_PHOTOS[id] ? photo(PRODUCT_PHOTOS[id]) : '', desc, includes,
      defaultEvent: type === 'service' ? (DEFAULT_EVENT[id] || 'Shaadi (Vivah)') : '',
      dailyCapacity: type === 'service' ? (DAILY_CAPACITY[id] != null ? DAILY_CAPACITY[id] : 5) : 0,
      featured: !!featured, minQty: minQty || 1, stock: type === 'product' ? 200 : 9999, active: true, districts: 'all',
      events: SERVICE_EVENTS[id] || [], // empty = can be booked for any function
      covers: SERVICE_COVERS[id] || [],
      createdAt: created,
    };
  });
  const packages = PACKAGES.map(([id, name, nameHi, img, desc, items], i) => ({ id, name, nameHi, image: photo(img, 800, 500), desc, items: items.map(([productId, qty]) => ({ productId, qty })), order: i + 1, active: true }));

  const admin = { id: 'u_admin', name: 'Admin', phone: '9000000000', email: '', role: 'admin', password: hashPassword('Admin@123'), addresses: [], wishlist: [], blocked: false, createdAt: created };
  const demoAddr = { name: 'Ravi Kumar', phone: '9876543210', line1: 'House 12, Boring Road', landmark: 'Near A.N. College', city: 'Patna', district: 'br-patna', pincode: '800001' };
  const demo = { id: 'u_demo', name: 'Ravi Kumar', phone: '9876543210', email: '', role: 'user', password: hashPassword('demo123'), addresses: [demoAddr], wishlist: ['p_001', 'p_010'], blocked: false, createdAt: created };

  // A few sample orders so the admin dashboard is not empty
  const day = k => new Date(Date.now() - k * 864e5).toISOString();
  const future = k => new Date(Date.now() + k * 864e5).toISOString().slice(0, 10);
  const pick = (id, qty, eventDate = '') => { const p = products.find(x => x.id === id); return { productId: p.id, name: p.name, emoji: p.emoji, image: p.image, type: p.type, unit: p.unit, price: p.price, mrp: p.mrp, qty, event: p.defaultEvent, eventDate: p.type === 'service' ? eventDate : '' }; };
  const mk = (n, items, addr, status, k) => {
    const subtotal = items.reduce((a, i) => a + i.price * i.qty, 0), mrpTotal = items.reduce((a, i) => a + i.mrp * i.qty, 0);
    const advance = Math.round(items.filter(i => i.type === 'service').reduce((a, i) => a + i.price * i.qty, 0) * 0.2);
    return { id: 'o_seed' + n, number: 'SA' + (1000 + n), userId: demo.id, userName: demo.name, userPhone: demo.phone, items, address: addr, paymentMethod: 'cod', note: '', eventDate: '', subtotal, mrpTotal, discount: mrpTotal - subtotal, delivery: 0, total: subtotal, advance, status, history: [{ status: 'placed', at: day(k), note: 'Order placed' }].concat(status !== 'placed' ? [{ status, at: day(k - 0.5), note: '' }] : []), adminNote: '', createdAt: day(k) };
  };
  const patna = { ...demoAddr, districtName: 'Patna', state: 'Bihar' };
  const varanasi = { name: 'Sunita Devi', phone: '9123456780', line1: 'Lanka, Near BHU Gate', landmark: '', city: 'Varanasi', district: 'up-varanasi', pincode: '221005', districtName: 'Varanasi', state: 'Uttar Pradesh' };
  const gorakhpur = { name: 'Amit Singh', phone: '9988776655', line1: 'Golghar', landmark: '', city: 'Gorakhpur', district: 'up-gorakhpur', pincode: '273001', districtName: 'Gorakhpur', state: 'Uttar Pradesh' };
  const darbhanga = { name: 'Pooja Jha', phone: '9431234567', line1: 'Laheriasarai', landmark: '', city: 'Darbhanga', district: 'br-darbhanga', pincode: '846001', districtName: 'Darbhanga', state: 'Bihar' };
  const orders = [
    mk(1, [pick('p_001', 1), pick('p_010', 1, future(20)), pick('p_016', 5)], patna, 'confirmed', 6),
    mk(2, [pick('p_032', 1, future(12)), pick('p_042', 1, future(12))], varanasi, 'placed', 1),
    mk(3, [pick('p_025', 2), pick('p_017', 10)], gorakhpur, 'delivered', 9),
    mk(4, [pick('p_005', 1), pick('p_043', 1, future(30)), pick('p_055', 1)], darbhanga, 'dispatched', 3),
    mk(5, [pick('p_047', 150, future(25))], patna, 'confirmed', 2),
  ];

  return {
    settings: {
      siteName: 'Vivah Saathi', tagline: 'Shaadi ka har saman, ek jagah', phone: '+91 90000 00000', whatsapp: '919000000000', email: 'support@vivahsaathi.in',
      deliveryCharge: 99, freeDeliveryAbove: 1999, advancePercent: 20,
      announcement: 'Bihar ke 38 aur UP ke 75 zilon mein seva uplabdh | Free delivery above ₹1999',
      banners: [
        { title: 'Shubh Vivah Samagri Kits', subtitle: 'Pandit Ji approved 51-item kits — haldi, tilak, sindoordaan & more', cta: 'Shop Kits', link: '#/c/puja-samagri', emoji: '🪔', theme: 'saffron' },
        { title: 'Book Pandit Ji in your District', subtitle: 'Vivah sanskar, tilak puja, kundli milan — local & experienced', cta: 'Book Now', link: '#/c/pandit-ji', emoji: '🙏', theme: 'maroon' },
        { title: 'Silao Khaja to Mathura Peda', subtitle: 'Famous mithai of Bihar & UP, delivered fresh', cta: 'Order Mithai', link: '#/c/mithai', emoji: '🍬', theme: 'pink' },
        { title: 'Tent, Band, Ghodi & Doli Car', subtitle: 'Book everything for the baraat in one place', cta: 'Explore', link: '#/c/tent', emoji: '⛺', theme: 'green' },
      ].map((b, i) => ({ ...b, image: photo(BANNER_PHOTOS[i], 1600, 600) })),
    },
    version: 3,
    counters: { order: 1005 },
    analytics: { days: {}, products: {} },
    categories, districts, products, packages,
    users: [admin, demo],
    sessions: {},
    orders,
  };
}

// rasams of a Bihar / UP wedding, in the order they happen (Baraat stays after Shaadi as before; 'Other' stays last)
const EVENTS = ['Sagai / Roka', 'Tilak / Chheka', 'Haldi', 'Mehndi', 'Matkor', 'Bhaat', 'Sangeet', 'Shaadi (Vivah)', 'Baraat', 'Bidai', 'Reception', 'Other'];

// the example "MRP" each sample product used to carry (lets an upgrade clear only MRPs nobody entered by hand)
const SAMPLE_MRP = Object.fromEntries(PRODUCTS.map((r, i) => ['p_' + String(i + 1).padStart(3, '0'), r[5]]));
module.exports = { buildSeed, EVENTS, SAMPLE_MRP, PRODUCT_PHOTOS, OLD_PRODUCT_PHOTOS, photo };
