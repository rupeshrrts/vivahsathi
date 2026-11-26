// Sample vendors for the marketplace. Every one is marked `sample: true` (shown with a "Sample" tag)
// and uses placeholder phone numbers. Remove them all from Admin → Vendors → "Remove sample vendors".
const { districtGeo } = require('./geo');
const photo = (id, w = 640, h = Math.round(w * 0.75)) => `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=70`;

// Photo table by listing name (sample listings and tent / decor / DJ rental items): [photo id, ...old seed ids it replaces].
// It wins over the photo id written in V / SAMPLE_RENTALS. The one-time photo upgrade in server.js swaps a sample
// listing's photo only while it is still empty or one of the old ids, so a vendor's own upload is never replaced.
const VEG = '1769598250411-815c984c33c3', SHELF = '1739065883249-3ac226faaa9d', MANDI = '1769685104379-0bedf8505586';
const LISTING_PHOTOS = {
  // ration
  'Desi Ghee': ['1573812461383-e5f8b759d12e', '1739066598279-1297113f5c6a'], 'Desi Ghee (15 kg tin)': ['1573812461383-e5f8b759d12e', '1739066598279-1297113f5c6a'],
  Sugar: ['1634612831148-03a8550e1d52', SHELF], 'Sugar (Chini)': ['1634612831148-03a8550e1d52'], 'Sugar (50 kg bag)': ['1634612831148-03a8550e1d52'],
  'Arhar Dal': ['1708436477916-f97964f3ccf1', SHELF], 'Arhar (Toor) Dal': ['1708436477916-f97964f3ccf1'], 'Arhar Dal (quintal)': ['1786301326154-3e040dc8db60'],
  'Chana Dal': ['1612869538502-b5baa439abd7'], 'Chana Dal (30 kg bag)': ['1612869538502-b5baa439abd7'], 'Moong Dal': ['1780478238047-13e4e6c07cba'],
  Maida: ['1627735483792-233bf632619b'], Besan: ['1610725664285-7c57e6eeac3f'], Salt: ['1763974463967-647601c65961'],
  'Haldi Powder': ['1768729340164-7d83fe18384d', '1784501025488-001592b6ee31'], 'Red Chilli Powder': ['1577563717655-919fc57789b4'],
  'Garam Masala (100 g packet)': ['1784501025488-001592b6ee31'], 'Kaju (Cashew) W320': ['1726771517475-e7acdd34cd8a'], Kishmish: ['1642102903918-b97c37955bbf'],
  // sabzi
  'Potato (Aloo)': ['1518977676601-b53f82aba655', MANDI], Tomato: ['1582284540020-8acbe03f4924', MANDI], 'Onion (Pyaz)': ['1782546079922-dc780b7e1efd', '1769598250421-e3b7afabaf32'],
  'Cauliflower (Gobhi)': ['1784043437088-c86a43eb695d', VEG], 'Green Peas (Matar)': ['1632640107771-80c37386cfcd', VEG], 'Coriander & Green Chilli': ['1599987141071-f5810d32e21a', VEG],
  'Cabbage (Patta Gobhi)': ['1652860213441-6622f9fec77f', VEG], 'Paneer (fresh)': ['1722635940350-d1b2e5129379', '1769598248811-ca17f77ae65c'], 'Kaddu (Pumpkin)': ['1632409328623-10daf9dc7cd3'],
  // mithai, gifts, cars
  Rasgulla: ['1714799263412-2e0c1f875959', '1765188988267-7018a757f1f3', '1695568181440-aca4dac18650'], 'Gaya Tilkut': ['1695568179778-822432650f94', '1635952346904-95f2ccfcd029'],
  'Kaju Katli': ['1699708263762-00ca477760bd', '1758910536889-43ce7b3199fd'], 'Plain white box': ['1573376670774-4427757f7963'],
  'Shagun Lifafa (pack of 50)': ['1592781959445-63e59ba0666d', '1513201099705-a9746e1e201f'], 'Toyota Fortuner': ['1664783856972-ac9922d7b2d3', '1618453731853-ed3bd864fbfc'],
  // tent / decor / DJ rental items
  'Bamboo Bally (12 ft)': ['1558299244-f4bb4dd735b2'], 'Iron Pipe Frame Set (20 ft span)': ['1721622045835-51a5447f281c'], 'Kanaat Side Wall (15 ft)': ['1786426923263-61e9699bfc39'],
  'Red Carpet (per 100 sq ft)': ['1776982298320-888d9f0ee1cd'], 'Darri / Jajam (10×15 ft)': ['1592914486106-fa452cfc092c'], 'Buffet Counter Table (6 ft)': ['1649140041688-0f75446e707e'],
  'Silent Generator 25 kVA': ['1780445392484-38a4852a1fd8'], 'Generator 10 kVA': ['1759692071712-adc78a8516c8'], 'Pedestal Fan': ['1601084195907-44baaa49dabd'], 'Desert Cooler': ['1790193718629-d5ca10f12415'],
  'Selfie Booth / Photo Frame': ['1788347101891-9e91920f99a5'], 'Table Flower Centrepiece': ['1598284653127-24eb19dd82db'], 'Rose Petals': ['1762328845997-c1fc8519b2e2'],
  'Wireless Mic': ['1702351002798-6ccc7598494a'], 'Smoke Machine': ['1678656037828-371b7029cf10'], 'LED Video Wall (10 sq ft)': ['1764257241003-e3464685770f'],
};
// sample vendors' main photos replaced later: old seed id → new (a dark road for the Fortuner, a man sitting for sabzi shops)
const VENDOR_PHOTO_FIXES = { '1618453731853-ed3bd864fbfc': '1664783856972-ac9922d7b2d3', '1769598248811-ca17f77ae65c': '1784043437088-c86a43eb695d' };
const listingPhotoId = (name, ph) => (LISTING_PHOTOS[name] ? LISTING_PHOTOS[name][0] : ph);

// [type, subtype, name, nameHi, owner, district, address, about, capacityPerDay, photoIds[], tags[], delivery|null, listings[], extra]
// listing: [name, nameHi, item, price, unit, stockOrUnits, specs, photoId, guestTiers?]
// guestTiers: [[guests, price], ...] — price by how many people the food is for (halwai / cooks)
const V = [
  // ---------- Vehicles ----------
  ['vehicle', 'car', 'Maa Tara Travels', 'माँ तारा ट्रेवल्स', 'Sanjay Yadav', 'br-patna', 'Bailey Road, near Raja Bazar, Patna', 'Bolero, Scorpio and Innova for baraat and family travel. Decorated cars available. Driver + fuel for 100 km included.', 0,
    ['1774012697329-273cb2bb1762', '1774670911280-c1d4a133b6a7', '1774015671070-621920d09e0b'], ['AC', 'Driver included', 'Decoration on request'], null, [
      ['Mahindra Bolero (7 seater)', 'महिंद्रा बोलेरो', 'bolero', 3500, 'day', 3, '7 seats · Non-AC · 100 km / 12 hrs', '1774670911280-c1d4a133b6a7'],
      ['Mahindra Scorpio (7 seater, AC)', 'महिंद्रा स्कॉर्पियो', 'scorpio', 4800, 'day', 2, '7 seats · AC · 100 km / 12 hrs', '1774012697329-273cb2bb1762'],
      ['Toyota Innova Crysta (AC)', 'इनोवा क्रिस्टा', 'innova', 6000, 'day', 1, '7 seats · AC · 100 km / 12 hrs', '1774015671070-621920d09e0b'],
    ]],
  ['vehicle', 'car', 'Shiv Shakti Car Rental', 'शिव शक्ति कार रेंटल', 'Rakesh Singh', 'br-siwan', 'Station Road, Siwan', 'SUVs for baraat in Siwan, Gopalganj and Chhapra. Decorated Scorpio for dulha.', 0,
    ['1785330865151-f2120b37469c', '1642927492908-f31e0f35b774'], ['Baraat specialist'], null, [
      ['Mahindra Scorpio N (decorated)', 'सजी स्कॉर्पियो', 'scorpio', 5500, 'day', 2, 'Flower decoration · AC · 120 km', '1785330865151-f2120b37469c'],
      ['Mahindra Bolero Neo', 'बोलेरो नियो', 'bolero', 3200, 'day', 2, '7 seats · AC · 100 km', '1642927492908-f31e0f35b774'],
      ['Mahindra Thar (open, dulha entry)', 'थार (दूल्हा एंट्री)', 'thar', 6500, 'event', 1, 'Open top · flowers & lights · 3 hrs', '1785330865151-f2120b37469c'],
    ]],
  ['vehicle', 'car', 'Kashi Luxury Cars', 'काशी लग्ज़री कार्स', 'Amit Mishra', 'up-varanasi', 'Sigra, Varanasi', 'Luxury sedans for dulha with chauffeur and designer flower decoration.', 0,
    ['1790845160661-f04a7c11c13f', '1760110885805-273b5bf5e50b', '1618453731853-ed3bd864fbfc'], ['Luxury', 'Chauffeur'], null, [
      ['Mercedes-Benz E-Class (decorated)', 'मर्सिडीज़ (सजी हुई)', 'luxury-sedan', 18000, 'day', 1, 'Chauffeur · designer flowers · 80 km / 8 hrs', '1790845160661-f04a7c11c13f'],
      ['Audi A6 (decorated)', 'ऑडी A6', 'luxury-sedan', 16000, 'day', 1, 'Chauffeur · flowers · 80 km / 8 hrs', '1760110885805-273b5bf5e50b'],
      ['Toyota Fortuner', 'फॉर्च्यूनर', 'fortuner', 9000, 'day', 2, '7 seats · AC · 120 km', '1618453731853-ed3bd864fbfc'],
    ]],
  ['vehicle', 'dulha', 'Royal Dulha Entry Services', 'रॉयल दूल्हा एंट्री', 'Pappu Khan', 'up-gorakhpur', 'Golghar, Gorakhpur', 'Grand dulha entry: vintage car, decorated open jeep, royal baggi and ghodi with lights and fireworks team.', 0,
    ['1724691003865-14d185039a73', '1561100966-f6aa0145e8e6', '1781077128735-ee92e7377d78'], ['Dulha entry', 'Fireworks team'], null, [
      ['Vintage Open Car', 'विंटेज ओपन कार', 'vintage-car', 21000, 'event', 1, '3 hrs · flowers', '1561100966-f6aa0145e8e6'],
      ['Decorated Open Jeep', 'सजी ओपन जीप', 'open-jeep', 8000, 'event', 2, 'Flowers, flags & lights · 3 hrs', '1724691003865-14d185039a73'],
      ['Royal Baggi (2 horses)', 'शाही बग्गी', 'baggi', 15000, 'event', 1, 'Lights · 3 hrs', '1781077128735-ee92e7377d78'],
      ['Decorated Ghodi', 'सजी घोड़ी', 'ghodi', 5100, 'event', 3, 'Handler · 3 hrs', '1588772740477-12d752619e8e'],
    ]],
  ['vehicle', 'dulha', 'Magadh Baggi & Ghodi', 'मगध बग्गी व घोड़ी', 'Lalu Paswan', 'br-gaya', 'Swarajpuri Road, Gaya', 'Ghodi and baggi for baraat nikasi in Gaya, Jehanabad and Aurangabad.', 0,
    ['1588772740477-12d752619e8e', '1781077128735-ee92e7377d78'], ['Ghodi', 'Baggi'], null, [
      ['White Ghodi (decorated)', 'सफेद घोड़ी', 'ghodi', 4500, 'event', 2, 'Handler · 3 hrs', '1588772740477-12d752619e8e'],
      ['Baggi with lights', 'लाइट वाली बग्गी', 'baggi', 12000, 'event', 1, '2 horses · 3 hrs', '1781077128735-ee92e7377d78'],
    ]],

  // ---------- Cooks & Catering ----------
  ['catering', 'caterer', 'Annapurna Caterers', 'अन्नपूर्णा कैटरर्स', 'Ramesh Halwai', 'br-patna', 'Kankarbagh Main Road, Patna', 'Pure veg wedding catering for 100–2000 guests. Live counters, uniformed staff, crockery included.', 2,
    ['1742281257687-092746ad6021', '1649140041688-0f75446e707e', '1721174233280-c55186b7cabc'], ['Pure veg', 'Live counters'], null, [
      ['Veg Bhoj Thali (Puri, 2 sabzi, pulao, raita, mithai)', 'शाकाहारी भोज थाली', 'veg-thali', 320, 'plate', 0, 'Min 100 plates', '1742281257687-092746ad6021'],
      ['Premium Buffet (starters, paneer, naan, 3 sweets)', 'प्रीमियम बुफे', 'buffet', 620, 'plate', 0, 'Min 150 plates', '1649140041688-0f75446e707e'],
      ['Chaat & Golgappa Counter', 'चाट काउंटर', 'chaat', 5500, 'counter', 0, '200 guests', '1781243680771-1fea4521e196'],
    ]],
  ['catering', 'cook', 'Mithila Rasoi – Halwai Team', 'मिथिला रसोई – हलवाई', 'Shyam Sundar Jha', 'br-darbhanga', 'Laheriasarai, Darbhanga', 'Traditional Maithil bhoj by experienced halwai team. You give ration or we arrange everything.', 1,
    ['1721174233280-c55186b7cabc', '1728364283053-b1e2abe71611'], ['Maithil bhoj', 'Halwai'], null, [
      ['Halwai team (you give ration)', 'हलवाई टीम (राशन आपका)', 'halwai', 12000, 'day', 0, 'Head halwai + 6 helpers + bhatti', '1721174233280-c55186b7cabc', [[100, 8000], [200, 12000], [300, 15000], [500, 20000]]],
      ['Maithil Bhoj (full arrangement)', 'मैथिल भोज', 'veg-thali', 360, 'plate', 0, 'Dahi-chura, sabzi, puri, mithai · min 100', '1742281257687-092746ad6021'],
    ], { experienceYears: 20, languages: ['Maithili', 'Hindi'], speciality: 'Maithil bhoj, dahi-chura, mithai', dishes: [
      ['Maithil special', 'Dahi-chura, Tilkor tarua, Bagiya, Ghugni, Makhana kheer, Kadhi-bari'],
      ['Sabzi & Dal', 'Aloo-parwal, Kaddu ki sabzi, Kathal sabzi, Chana dal, Arhar dal tadka'],
      ['Puri, Rice & Roti', 'Puri, Kachori, Dal-puri, Pulao, Jeera rice'],
      ['Mithai', 'Rasgulla, Gulab jamun, Khaja, Balushahi, Motichoor laddoo'],
      ['Nashta', 'Pakode, Aloo chop, Bundi raita']] }],
  ['catering', 'caterer', 'Awadh Shahi Caterers', 'अवध शाही कैटरर्स', 'Mohd. Irfan', 'up-lucknow', 'Aminabad, Lucknow', 'Awadhi wedding menus — veg and non-veg — for receptions and walimas.', 2,
    ['1680993032090-1ef7ea9b51e5', '1649140041688-0f75446e707e'], ['Veg & non-veg', 'Awadhi'], null, [
      ['Awadhi Veg Menu', 'अवधी शाकाहारी मेनू', 'veg-thali', 450, 'plate', 0, 'Min 100 plates', '1680993032090-1ef7ea9b51e5'],
      ['Awadhi Royal Buffet', 'अवधी रॉयल बुफे', 'buffet', 850, 'plate', 0, 'Min 150 plates', '1649140041688-0f75446e707e'],
    ]],

  // ---------- Raw Materials & Ration ----------
  ['ration', '', 'Gupta Kirana & Ration Bhandar', 'गुप्ता किराना व राशन भंडार', 'Manoj Gupta', 'br-patna', 'Machhua Toli, Patna', 'Wholesale ration for weddings — rice, atta, oil, dal, masale. Bulk rates and free delivery above ₹10,000.', 0,
    ['1739066598279-1297113f5c6a', '1586201375761-83865001e31c', '1784501025488-001592b6ee31'], ['Wholesale', 'Bulk rates'], { available: true, charge: 150, freeAbove: 10000 }, [
      ['Basmati Rice', 'बासमती चावल', 'rice-basmati', 95, 'kg', 500, '', '1586201375761-83865001e31c'],
      ['Arwa / Sona Rice', 'अरवा चावल', 'rice-regular', 42, 'kg', 1500, '', '1686820740687-426a7b9b2043'],
      ['Chakki Atta', 'चक्की आटा', 'atta', 34, 'kg', 1200, '', '1714842981153-ffeaf74e7a1a'],
      ['Mustard Oil (Kachi Ghani)', 'सरसों तेल', 'mustard-oil', 165, 'litre', 300, '', '1757801333068-d52a3e448cde'],
      ['Refined Oil', 'रिफाइंड तेल', 'refined-oil', 135, 'litre', 300, '', '1757801333068-d52a3e448cde'],
      ['Sugar', 'चीनी', 'sugar', 44, 'kg', 800, '', '1739065883249-3ac226faaa9d'],
      ['Arhar Dal', 'अरहर दाल', 'arhar-dal', 150, 'kg', 300, '', '1739065883249-3ac226faaa9d'],
      ['Garam Masala Kit (1 kg)', 'गरम मसाला किट', 'masala-kit', 520, 'kit', 80, 'Haldi, mirch, dhaniya, jeera, garam masala', '1784501025488-001592b6ee31'],
    ]],
  ['ration', '', 'Bhagalpur Anaj Mandi Traders', 'भागलपुर अनाज मंडी ट्रेडर्स', 'Sunil Agrawal', 'br-bhagalpur', 'Sujaganj Bazar, Bhagalpur', 'Rice, atta, oil and ghee at mandi rates for weddings in Bhagalpur and Banka.', 0,
    ['1739065883249-3ac226faaa9d', '1761222191837-4448599c09fc'], ['Mandi rates'], { available: true, charge: 200, freeAbove: 15000 }, [
      ['Basmati Rice', 'बासमती चावल', 'rice-basmati', 89, 'kg', 400, '', '1586201375761-83865001e31c'],
      ['Arwa / Sona Rice', 'अरवा चावल', 'rice-regular', 39, 'kg', 2000, '', '1686820740687-426a7b9b2043'],
      ['Chakki Atta', 'चक्की आटा', 'atta', 32, 'kg', 1500, '', '1761222191837-4448599c09fc'],
      ['Mustard Oil (Kachi Ghani)', 'सरसों तेल', 'mustard-oil', 172, 'litre', 200, '', '1757801333068-d52a3e448cde'],
      ['Desi Ghee', 'देसी घी', 'ghee', 620, 'kg', 100, '', '1739066598279-1297113f5c6a'],
      ['Sugar', 'चीनी', 'sugar', 42, 'kg', 1000, '', '1739065883249-3ac226faaa9d'],
    ]],
  ['ration', '', 'Kashi Masala & Grocery', 'काशी मसाला व किराना', 'Pradeep Jaiswal', 'up-varanasi', 'Vishweshwarganj, Varanasi', 'Spices, dry fruits and wedding grocery packs.', 0,
    ['1716816211590-c15a328a5ff0', '1757801752791-8bcd63cec878'], ['Masale', 'Dry fruits'], { available: true, charge: 100, freeAbove: 5000 }, [
      ['Garam Masala Kit (1 kg)', 'गरम मसाला किट', 'masala-kit', 480, 'kit', 120, '', '1716816211590-c15a328a5ff0'],
      ['Haldi Powder', 'हल्दी पाउडर', 'haldi', 220, 'kg', 100, '', '1784501025488-001592b6ee31'],
      ['Basmati Rice', 'बासमती चावल', 'rice-basmati', 99, 'kg', 300, '', '1586201375761-83865001e31c'],
      ['Refined Oil', 'रिफाइंड तेल', 'refined-oil', 129, 'litre', 250, '', '1757801333068-d52a3e448cde'],
    ]],

  // ---------- Vegetables ----------
  ['vegetable', '', 'Raju Sabzi Bhandar', 'राजू सब्ज़ी भंडार', 'Raju Mahto', 'br-patna', 'Rajendra Nagar Sabzi Mandi, Patna', 'Fresh vegetables from the mandi every morning. Bulk wedding orders delivered by 9 AM.', 0,
    ['1769685104379-0bedf8505586', '1769598250421-e3b7afabaf32'], ['Fresh daily', 'Bulk'], { available: true, charge: 100, freeAbove: 3000 }, [
      ['Potato (Aloo)', 'आलू', 'potato', 22, 'kg', 600, '', '1769685104379-0bedf8505586'],
      ['Onion (Pyaz)', 'प्याज़', 'onion', 35, 'kg', 400, '', '1769598250421-e3b7afabaf32'],
      ['Tomato', 'टमाटर', 'tomato', 30, 'kg', 250, '', '1769685104379-0bedf8505586'],
      ['Cauliflower (Gobhi)', 'फूलगोभी', 'cauliflower', 40, 'kg', 150, '', '1769598250411-815c984c33c3'],
      ['Green Peas (Matar)', 'हरी मटर', 'peas', 60, 'kg', 120, '', '1769598250411-815c984c33c3'],
      ['Paneer (fresh)', 'पनीर', 'paneer', 340, 'kg', 60, 'Made fresh, keep cool', '1769598248811-ca17f77ae65c'],
      ['Coriander & Green Chilli', 'धनिया व हरी मिर्च', 'coriander', 120, 'kg', 30, '', '1769598250411-815c984c33c3'],
    ]],
  ['vegetable', '', 'Muzaffarpur Fresh Mandi Supply', 'मुज़फ़्फ़रपुर फ्रेश मंडी', 'Dinesh Sah', 'br-muzaffarpur', 'Bazar Samiti, Muzaffarpur', 'Wholesale vegetables and paneer for marriage functions.', 0,
    ['1769598250411-815c984c33c3', '1769598248811-ca17f77ae65c'], ['Wholesale'], { available: true, charge: 150, freeAbove: 4000 }, [
      ['Potato (Aloo)', 'आलू', 'potato', 20, 'kg', 1000, '', '1769685104379-0bedf8505586'],
      ['Onion (Pyaz)', 'प्याज़', 'onion', 33, 'kg', 600, '', '1769598250421-e3b7afabaf32'],
      ['Tomato', 'टमाटर', 'tomato', 28, 'kg', 300, '', '1769685104379-0bedf8505586'],
      ['Paneer (fresh)', 'पनीर', 'paneer', 320, 'kg', 80, '', '1769598248811-ca17f77ae65c'],
      ['Cabbage (Patta Gobhi)', 'पत्ता गोभी', 'cabbage', 25, 'kg', 200, '', '1769598250411-815c984c33c3'],
    ]],
  ['vegetable', '', 'Prayag Sabzi Wholesale', 'प्रयाग सब्ज़ी होलसेल', 'Kamlesh Kesarwani', 'up-prayagraj', 'Mundera Mandi, Prayagraj', 'Daily fresh stock, delivery across Prayagraj city.', 0,
    ['1769598248811-ca17f77ae65c', '1769685104379-0bedf8505586'], ['Fresh daily'], { available: false, charge: 0, freeAbove: 0 }, [
      ['Potato (Aloo)', 'आलू', 'potato', 21, 'kg', 800, '', '1769685104379-0bedf8505586'],
      ['Onion (Pyaz)', 'प्याज़', 'onion', 36, 'kg', 500, '', '1769598250421-e3b7afabaf32'],
      ['Green Peas (Matar)', 'हरी मटर', 'peas', 55, 'kg', 200, '', '1769598250411-815c984c33c3'],
    ]],

  // ---------- Sweets ----------
  ['sweets', '', 'Silao Khaja Ghar', 'सिलाव खाजा घर', 'Kailash Prasad', 'br-patna', 'Ashok Rajpath, Patna', 'Original Silao khaja, laddoo and tilkut. Bulk orders for tilak and vidai with printed boxes.', 0,
    ['1695568181440-aca4dac18650', '1695568181747-f54dff1d4654'], ['Bulk orders', 'Printed boxes'], { available: true, charge: 150, freeAbove: 5000 }, [
      ['Silao Khaja', 'सिलाव खाजा', 'khaja', 460, 'kg', 300, '', '1695568181440-aca4dac18650'],
      ['Motichoor Laddoo (desi ghee)', 'मोतीचूर लड्डू', 'laddoo', 420, 'kg', 250, '', '1695568181747-f54dff1d4654'],
      ['Gaya Tilkut', 'तिलकुट', 'tilkut', 380, 'kg', 150, '', '1635952346904-95f2ccfcd029'],
      ['Shagun Box (500 g, printed)', 'शगुन डिब्बा', 'shagun-box', 210, 'box', 500, 'Your names printed on the sleeve', '1758910536889-43ce7b3199fd'],
    ]],
  ['sweets', '', 'Brijwasi Mithai Bhandar', 'बृजवासी मिठाई भंडार', 'Gopal Agrawal', 'up-varanasi', 'Godowlia, Varanasi', 'Peda, kaju katli, rasgulla and Banarasi mithai for weddings.', 0,
    ['1758910536889-43ce7b3199fd', '1699708263762-00ca477760bd'], ['Banarasi mithai'], { available: true, charge: 100, freeAbove: 4000 }, [
      ['Kaju Katli', 'काजू कतली', 'kaju-katli', 1050, 'kg', 120, '', '1699708263762-00ca477760bd'],
      ['Motichoor Laddoo (desi ghee)', 'मोतीचूर लड्डू', 'laddoo', 440, 'kg', 200, '', '1695568181747-f54dff1d4654'],
      ['Rasgulla', 'रसगुल्ला', 'rasgulla', 280, 'kg', 300, '', '1765188988267-7018a757f1f3'],
      ['Mathura Peda', 'पेड़ा', 'peda', 540, 'kg', 150, '', '1695568181363-af5c78f4d059'],
    ]],
  ['sweets', '', 'Begusarai Mishthan Bhandar', 'बेगूसराय मिष्ठान भंडार', 'Vijay Saw', 'br-begusarai', 'Main Road, Begusarai', 'Fresh laddoo, rasgulla and jalebi for tilak and shaadi.', 0,
    ['1760263217152-009971f0bccc', '1778448806852-db6a837fa98f'], ['Fresh daily'], { available: true, charge: 80, freeAbove: 3000 }, [
      ['Motichoor Laddoo (desi ghee)', 'मोतीचूर लड्डू', 'laddoo', 400, 'kg', 200, '', '1695568181747-f54dff1d4654'],
      ['Rasgulla', 'रसगुल्ला', 'rasgulla', 260, 'kg', 250, '', '1765188988267-7018a757f1f3'],
      ['Jalebi (fresh, made on order)', 'जलेबी', 'jalebi', 240, 'kg', 100, '', '1778448806852-db6a837fa98f'],
    ]],

  // ---------- Cameras & Studios ----------
  ['studio', '', 'Pixel Wedding Studio', 'पिक्सल वेडिंग स्टूडियो', 'Rohit Kumar', 'br-patna', 'Boring Road, Patna', 'Candid photography, cinematic films and drone. 2 teams, so we can cover 2 weddings a day.', 2,
    ['1471341971476-ae15ff5dd4ea', '1741201864879-c5e7f81c98b0', '1754782915842-aa4fca6c203a', '1630526720753-aa4e71acf67d', '1722952934708-749c22eb2e58'], ['Candid', 'Drone', 'Cinematic'], null, [
      ['Traditional Photo + Video (1 day)', 'पारंपरिक फोटो + वीडियो', 'photo-video', 22000, 'day', 0, '300+ photos · full HD video', '1611550287705-7ff8b459c8eb'],
      ['Candid + Cinematic Film (2 days)', 'कैंडिड + सिनेमैटिक', 'cinematic', 52000, 'package', 0, 'Highlight reel · album', '1629756048377-09540f52caa1'],
      ['Drone Coverage', 'ड्रोन कवरेज', 'drone', 7500, 'event', 0, '', '1473968512647-3e447244af8f'],
    ], { videos: ['https://www.youtube.com/results?search_query=bihar+wedding+highlights'] }],
  ['studio', '', 'Saathiya Films & Photography', 'साथिया फिल्म्स', 'Ankit Srivastava', 'up-lucknow', 'Hazratganj, Lucknow', 'Pre-wedding, wedding and reception photography with same-day edit.', 1,
    ['1758613655304-48776efb25d8', '1722952934708-749c22eb2e58', '1587271636175-90d58cdad458'], ['Pre-wedding', 'Same-day edit'], null, [
      ['Wedding Photography (1 day)', 'शादी फोटोग्राफी', 'photo-video', 25000, 'day', 0, '2 photographers', '1611550287705-7ff8b459c8eb'],
      ['Pre-Wedding Shoot', 'प्री-वेडिंग शूट', 'prewedding', 18000, 'shoot', 0, '2 locations', '1630526720753-aa4e71acf67d'],
    ]],
  ['studio', '', 'Gaya Digital Studio', 'गया डिजिटल स्टूडियो', 'Pankaj Verma', 'br-gaya', 'Tower Chowk, Gaya', 'Affordable photo + video packages with album.', 1,
    ['1587090564077-c7b8f2f1249e', '1741201864879-c5e7f81c98b0'], ['Budget'], null, [
      ['Photo + Video (1 day) with album', 'फोटो + वीडियो एल्बम सहित', 'photo-video', 15000, 'day', 0, '40-sheet album', '1611550287705-7ff8b459c8eb'],
      ['Haldi / Mehndi Photographer (4 hrs)', 'हल्दी / मेहंदी फोटोग्राफर', 'event-photo', 5000, 'event', 0, '', '1681717166573-f71589207785'],
    ]],

  // ---------- DJ & Sound ----------
  ['dj', '', 'DJ Bhola Sound', 'डीजे भोला साउंड', 'Bhola Ram', 'br-begusarai', 'Kachahri Road, Begusarai', 'Bhojpuri & Bollywood DJ with 8+8 speaker setup, sharpy lights and LED wall.', 2,
    ['1470225620780-dba8ba36b745', '1574155376612-bfa4ed8aabfd'], ['Bhojpuri', 'LED wall'], null, [
      ['DJ Basic (4+4 speakers)', 'डीजे बेसिक', 'dj', 9000, 'night', 0, '6 hrs · lights', '1470225620780-dba8ba36b745'],
      ['DJ Premium (8+8, LED wall)', 'डीजे प्रीमियम', 'dj-premium', 22000, 'night', 0, '6 hrs · sharpy · smoke', '1574155376612-bfa4ed8aabfd'],
    ]],
  ['dj', '', 'DJ Rocky Events', 'डीजे रॉकी इवेंट्स', 'Rocky Singh', 'up-gorakhpur', 'Bank Road, Gorakhpur', 'DJ for baraat (on vehicle) and sangeet night.', 1,
    ['1730818203797-897b2838105a', '1470225620780-dba8ba36b745'], ['Baraat DJ'], null, [
      ['Baraat DJ on vehicle', 'बारात डीजे (गाड़ी पर)', 'dj-baraat', 12000, 'baraat', 0, 'Generator included', '1730818203797-897b2838105a'],
      ['Sangeet Night DJ', 'संगीत नाइट डीजे', 'dj', 10000, 'night', 0, '5 hrs', '1470225620780-dba8ba36b745'],
    ]],

  // ---------- Pandit Ji ----------
  ['pandit', '', 'Pt. Ramakant Mishra (Vivah Sanskar)', 'पं. रमाकांत मिश्र', 'Pt. Ramakant Mishra', 'br-patna', 'Rajendra Nagar, Patna', '25+ years of vivah sanskar in Bhojpuri / Maithili / Hindi. Kundli milan and muhurat also.', 2,
    ['1741201864879-c5e7f81c98b0', '1764135264848-c1cbff661b50'], ['Bhojpuri', 'Maithili', 'Kundli milan'], null, [
      ['Vivah Sanskar (full ceremony, 2 pandits)', 'विवाह संस्कार', 'vivah', 11000, 'ceremony', 0, 'Dwar puja to vidai', '1741201864879-c5e7f81c98b0'],
      ['Tilak / Chheka Puja', 'तिलक पूजा', 'tilak', 3100, 'ceremony', 0, '', '1754782915842-aa4fca6c203a'],
      ['Kundli Milan', 'कुंडली मिलान', 'kundli', 501, 'report', 0, 'Written report', '1777732341528-782603ab6871'],
    ], { experienceYears: 25, languages: ['Bhojpuri', 'Maithili', 'Hindi'], speciality: 'Vivah sanskar, tilak, kundli milan' }],
  ['pandit', '', 'Acharya Vinod Shastri', 'आचार्य विनोद शास्त्री', 'Acharya Vinod Shastri', 'up-varanasi', 'Assi Ghat, Varanasi', 'Kashi Vedic pandit for vivah, havan and Satyanarayan katha.', 1,
    ['1764135264848-c1cbff661b50', '1630764883473-e8c2056f0589'], ['Vedic', 'Havan'], null, [
      ['Vivah Sanskar (Vedic)', 'वैदिक विवाह संस्कार', 'vivah', 15000, 'ceremony', 0, '3 pandits', '1741201864879-c5e7f81c98b0'],
      ['Satyanarayan Katha + Havan', 'सत्यनारायण कथा + हवन', 'katha', 2500, 'puja', 0, '', '1630764883473-e8c2056f0589'],
    ], { experienceYears: 20, languages: ['Hindi', 'Sanskrit', 'Bhojpuri'], speciality: 'Vedic vivah, havan, Satyanarayan katha' }],
  ['pandit', '', 'Pt. Sushil Jha (Maithil)', 'पं. सुशील झा', 'Pt. Sushil Jha', 'br-darbhanga', 'Lalbagh, Darbhanga', 'Maithil vivah vidhi, kohbar puja and chaturthi.', 1,
    ['1777732341528-782603ab6871', '1741201864879-c5e7f81c98b0'], ['Maithili'], null, [
      ['Maithil Vivah Vidhi', 'मैथिल विवाह विधि', 'vivah', 9000, 'ceremony', 0, '', '1741201864879-c5e7f81c98b0'],
      ['Matkor & Haldi Puja', 'मटकोर व हल्दी पूजा', 'haldi-puja', 2100, 'puja', 0, '', '1681717166573-f71589207785'],
    ], { experienceYears: 28, languages: ['Maithili', 'Hindi'], speciality: 'Maithil vivah vidhi, kohbar puja, chaturthi' }],

  // ---------- Orchestra & Artists ----------
  ['orchestra', 'group', 'Sample Orchestra Group – Patna', 'सैंपल आर्केस्ट्रा ग्रुप – पटना', 'Group Manager', 'br-patna', 'Patna City, Patna', 'Example listing showing how an orchestra group appears: Bhojpuri singers, dancers, anchor, sound and lights. Real groups register via "Join as Vendor / Artist".', 1,
    ['1688820661462-a44e4b2770e8', '1526478806334-5fd488fcaabc'], ['Bhojpuri stage show', 'Singers & dancers'], null, [
      ['Stage Show (3 hrs, 8 artists)', 'स्टेज शो (3 घंटे)', 'orchestra', 45000, 'show', 0, 'Sound & lights included', '1688820661462-a44e4b2770e8'],
      ['Full Night Program (6 hrs)', 'पूरी रात कार्यक्रम', 'orchestra-night', 80000, 'night', 0, '12 artists', '1526478806334-5fd488fcaabc'],
    ]],
  ['orchestra', 'group', 'Sample Musical Night – Gorakhpur', 'सैंपल म्यूज़िकल नाइट – गोरखपुर', 'Group Manager', 'up-gorakhpur', 'Gorakhpur', 'Example orchestra listing for weddings in Purvanchal.', 1,
    ['1620577610365-86c411bad78d', '1670028514318-0ac718c0590d'], ['Purvanchal'], null, [
      ['Musical Night (4 hrs)', 'म्यूज़िकल नाइट', 'orchestra', 38000, 'show', 0, '', '1620577610365-86c411bad78d'],
    ]],
  ['orchestra', 'artist', 'Sample Bhojpuri Singer', 'सैंपल भोजपुरी गायक', 'Artist Manager', 'br-siwan', 'Siwan', 'Example of an individual artist profile (singer). Real artists add their own photos, videos and rates after registering.', 1,
    ['1595422656857-ced3a4a0ce25'], ['Singer', 'Bhojpuri'], null, [
      ['Live Singing (2 hrs)', 'लाइव गायन (2 घंटे)', 'singer', 25000, 'show', 0, 'With 2 musicians', '1595422656857-ced3a4a0ce25'],
    ]],
  ['orchestra', 'artist', 'Sample Stage Dancer', 'सैंपल स्टेज डांसर', 'Artist Manager', 'br-muzaffarpur', 'Muzaffarpur', 'Example of an individual dancer profile. Real artists register via "Join as Vendor / Artist" and are verified before appearing.', 1,
    ['1632292611299-980426b386a1'], ['Dancer'], null, [
      ['Dance Performance (1 hr)', 'डांस परफ़ॉर्मेंस (1 घंटा)', 'dancer', 15000, 'show', 0, '', '1632292611299-980426b386a1'],
    ]],
  ['orchestra', 'artist', 'Sample Anchor / Host', 'सैंपल एंकर / होस्ट', 'Artist Manager', 'up-lucknow', 'Lucknow', 'Example anchor for sangeet, jaimala and reception.', 1,
    ['1516280440614-37939bbacd81'], ['Anchor'], null, [
      ['Anchoring (3 hrs)', 'एंकरिंग (3 घंटे)', 'anchor', 12000, 'event', 0, 'Games & jaimala hosting', '1516280440614-37939bbacd81'],
    ]],

  // ---------- Individual cooks (added later – keep at the end so ids stay stable) ----------
  ['catering', 'cook', 'Ramesh Prasad (Halwai)', 'रमेश प्रसाद (हलवाई)', 'Ramesh Prasad', 'br-gaya', 'Ramna Road, Gaya', 'Wedding halwai with 22 years of experience. Brings his own team of 4 helpers and bhatti. You give the ration, he cooks for up to 600 guests.', 1,
    ['1721174233280-c55186b7cabc'], ['Halwai', 'Own helpers'], null, [
      ['Halwai with 4 helpers (you give ration)', 'हलवाई 4 सहायक सहित (राशन आपका)', 'halwai', 9000, 'day', 0, 'Puri-sabzi, pulao, bundi, raita · up to 600 guests', '1721174233280-c55186b7cabc', [[100, 6500], [200, 9000], [300, 11500], [500, 15000]]],
      ['Mithai making (laddoo / gulab jamun)', 'मिठाई बनाना (लड्डू / गुलाब जामुन)', 'mithai-making', 3000, 'day', 0, '', '1695568181747-f54dff1d4654'],
    ], { experienceYears: 22, languages: ['Hindi', 'Magahi'], speciality: 'Puri-sabzi, bundi, motichoor laddoo', dishes: [
      ['Sabzi & Dal', 'Aloo-gobhi, Paneer butter masala, Matar paneer, Mix veg, Chhole, Dal makhani, Kadhi'],
      ['Puri, Rice & Roti', 'Puri, Kachori, Pulao, Jeera rice, Tandoori roti, Naan'],
      ['Mithai', 'Bundi, Motichoor laddoo, Gulab jamun, Imarti, Tilkut, Anarsa'],
      ['Nashta & Chaat', 'Samosa, Pakode, Aloo tikki chaat, Golgappa'],
      ['Raita & Salad', 'Bundi raita, Green salad, Papad']] }],
  ['catering', 'cook', 'Sunita Devi (Home-style Cook)', 'सुनीता देवी (घरेलू खाना)', 'Sunita Devi', 'br-patna', 'Kankarbagh, Patna', 'Home-style cooking for tilak, haldi, mehndi and small functions up to 100 guests.', 1,
    ['1742281257687-092746ad6021'], ['Ghar jaisa khana', 'Small functions'], null, [
      ['Cook for small function (up to 100 guests)', 'छोटे कार्यक्रम के लिए कुक (100 मेहमान तक)', 'cook', 4500, 'day', 0, 'With 1 helper', '1742281257687-092746ad6021', [[50, 3000], [100, 4500]]],
      ['Haldi / tilak bhoj cook', 'हल्दी / तिलक भोज कुक', 'cook', 3500, 'event', 0, '', '1680993032090-1ef7ea9b51e5'],
    ], { experienceYears: 12, languages: ['Hindi', 'Bhojpuri'], speciality: 'Ghar jaisa khana, dal-bhaat, kheer', dishes: [
      ['Ghar ka khana', 'Dal-bhaat, Aloo bhujia, Baingan chokha, Litti-chokha, Saag, Kadhi-chawal'],
      ['Tilak / Haldi bhoj', 'Puri-sabzi, Aloo dum, Kaddu ki sabzi, Pulao'],
      ['Meetha', 'Kheer, Suji halwa, Malpua, Thekua'],
      ['Saath mein', 'Papad, Achar, Chutney, Raita']] }],
  ['catering', 'cook', 'Mohan Maharaj (Bhoj Specialist)', 'मोहन महाराज (भोज विशेषज्ञ)', 'Mohan Maharaj', 'up-varanasi', 'Lahurabir, Varanasi', 'Banarasi bhoj specialist — kachori-sabzi, malaiyo, jalebi. Team of 6 for big weddings.', 1,
    ['1728364283053-b1e2abe71611'], ['Banarasi bhoj', 'Team of 6'], null, [
      ['Bhoj cook team of 6 (you give ration)', 'भोज टीम 6 लोग (राशन आपका)', 'halwai', 11000, 'day', 0, 'Up to 800 guests', '1728364283053-b1e2abe71611', [[100, 7500], [200, 11000], [300, 14000], [500, 18000], [800, 24000]]],
      ['Chaat & jalebi counter cook', 'चाट व जलेबी काउंटर कुक', 'chaat', 4000, 'event', 0, '', '1778448806852-db6a837fa98f'],
    ], { experienceYears: 30, languages: ['Hindi', 'Bhojpuri'], speciality: 'Kachori-sabzi, malaiyo, jalebi', dishes: [
      ['Banarasi special', 'Kachori-sabzi, Malaiyo, Tamatar chaat, Chena dahi vada, Launglata'],
      ['Sabzi & Dal', 'Aloo dum, Shahi paneer, Malai kofta, Mix veg, Dal fry, Kadhi'],
      ['Puri, Rice & Roti', 'Puri, Pulao, Jeera rice, Tandoori roti'],
      ['Mithai', 'Jalebi, Rabri, Gulab jamun, Lal peda, Imarti, Rasmalai']] }],
  ['catering', 'cook', 'Abdul Rashid (Awadhi Bawarchi)', 'अब्दुल रशीद (अवधी बावर्ची)', 'Abdul Rashid', 'up-lucknow', 'Chowk, Lucknow', 'Awadhi bawarchi for walima, reception and veg/non-veg dawat.', 1,
    ['1680993032090-1ef7ea9b51e5'], ['Awadhi', 'Veg & non-veg'], null, [
      ['Bawarchi team (you give ration)', 'बावर्ची टीम (राशन आपका)', 'halwai', 14000, 'day', 0, 'Biryani, korma, sheermal · up to 500 guests', '1680993032090-1ef7ea9b51e5', [[100, 9000], [200, 14000], [300, 18000], [500, 24000]]],
    ], { experienceYears: 25, languages: ['Hindi', 'Urdu'], speciality: 'Biryani, korma, sheermal', dishes: [
      ['Non-veg', 'Mutton biryani, Chicken biryani, Chicken korma, Mutton qorma, Galouti kebab, Shami kebab, Nihari, Chicken tikka'],
      ['Veg', 'Veg biryani, Paneer korma, Dal makhani, Mix veg, Kadhai paneer'],
      ['Roti & Paratha', 'Sheermal, Rumali roti, Warqi paratha, Naan'],
      ['Meetha', 'Shahi tukda, Phirni, Zarda, Kheer']] }],

  // ---------- More Pandit Ji ----------
  ['pandit', '', 'Pt. Dinesh Pandey', 'पं. दिनेश पांडेय', 'Pt. Dinesh Pandey', 'up-gorakhpur', 'Shahpur, Gorakhpur', 'Vivah, tilak and griha pravesh in Bhojpuri and Hindi. Samagri list shared on WhatsApp.', 2,
    ['1741201864879-c5e7f81c98b0'], ['Bhojpuri', 'Samagri list'], null, [
      ['Vivah Sanskar', 'विवाह संस्कार', 'vivah', 7100, 'ceremony', 0, '2 pandits', '1741201864879-c5e7f81c98b0'],
      ['Tilak Puja', 'तिलक पूजा', 'tilak', 2100, 'ceremony', 0, '', '1754782915842-aa4fca6c203a'],
      ['Griha Pravesh Puja', 'गृह प्रवेश पूजा', 'griha-pravesh', 2500, 'puja', 0, '', '1630764883473-e8c2056f0589'],
    ], { experienceYears: 18, languages: ['Bhojpuri', 'Hindi'], speciality: 'Vivah, tilak, griha pravesh' }],
  ['pandit', '', 'Pt. Ajay Tiwari', 'पं. अजय तिवारी', 'Pt. Ajay Tiwari', 'br-muzaffarpur', 'Juran Chhapra, Muzaffarpur', 'Young and punctual pandit ji for vivah and Satyanarayan katha. Explains every rasam.', 2,
    ['1764135264848-c1cbff661b50'], ['Punctual', 'Explains rasams'], null, [
      ['Vivah Sanskar', 'विवाह संस्कार', 'vivah', 6500, 'ceremony', 0, '', '1741201864879-c5e7f81c98b0'],
      ['Satyanarayan Katha', 'सत्यनारायण कथा', 'katha', 1500, 'puja', 0, '', '1630764883473-e8c2056f0589'],
    ], { experienceYears: 15, languages: ['Hindi', 'Bhojpuri', 'Maithili'], speciality: 'Vivah sanskar, Satyanarayan katha' }],

  // ---------- More Arkestra (samples – real groups / artists register themselves) ----------
  ['orchestra', 'group', 'Sample Bhojpuri Arkestra – Siwan', 'सैंपल भोजपुरी आर्केस्ट्रा – सीवान', 'Group Manager', 'br-siwan', 'Siwan', 'Example listing: Bhojpuri arkestra with live singers, dancers, anchor, band and LED stage for tilak & shaadi nights.', 1,
    ['1463592177119-bab2a00f3ccb', '1764014792668-bc484714744f'], ['Bhojpuri', 'LED stage', 'Live band'], null, [
      ['Tilak Night Program (4 hrs)', 'तिलक नाइट कार्यक्रम (4 घंटे)', 'orchestra', 35000, 'show', 0, '8 artists · sound & lights', '1463592177119-bab2a00f3ccb'],
      ['Shaadi Full Night Arkestra', 'शादी पूरी रात आर्केस्ट्रा', 'orchestra-night', 70000, 'night', 0, '12 artists · LED wall', '1764014792668-bc484714744f'],
    ], { experienceYears: 10, languages: ['Bhojpuri', 'Hindi'], speciality: 'Bhojpuri stage show' }],
  ['orchestra', 'group', 'Sample Musical Arkestra – Chhapra', 'सैंपल म्यूज़िकल आर्केस्ट्रा – छपरा', 'Group Manager', 'br-saran', 'Chhapra', 'Example listing: musical night with Bhojpuri & Bollywood songs, dance and comedy.', 1,
    ['1565035010268-a3816f98589a', '1577648884063-1d3d1477b8a7'], ['Bhojpuri & Bollywood', 'Comedy'], null, [
      ['Musical Night (5 hrs)', 'म्यूज़िकल नाइट (5 घंटे)', 'orchestra', 42000, 'show', 0, '10 artists', '1565035010268-a3816f98589a'],
    ], { experienceYears: 8, languages: ['Bhojpuri', 'Hindi'], speciality: 'Musical night' }],
  ['orchestra', 'group', 'Sample Jagran & Bhakti Party – Gaya', 'सैंपल जागरण व भक्ति पार्टी – गया', 'Group Manager', 'br-gaya', 'Gaya', 'Example listing: Devi jagran, bhajan sandhya and Shiv charcha for wedding functions.', 1,
    ['1657020411310-40e10e211c9d', '1568219656418-15c329312bf1'], ['Jagran', 'Bhajan'], null, [
      ['Mata Jagran (full night)', 'माता जागरण (पूरी रात)', 'jagran', 25000, 'night', 0, '', '1657020411310-40e10e211c9d'],
      ['Bhajan Sandhya (3 hrs)', 'भजन संध्या (3 घंटे)', 'bhajan', 12000, 'show', 0, '', '1568219656418-15c329312bf1'],
    ], { experienceYears: 15, languages: ['Hindi', 'Bhojpuri', 'Magahi'], speciality: 'Jagran, bhajan' }],
  ['orchestra', 'group', 'Sample Dance Troupe – Ara', 'सैंपल डांस ग्रुप – आरा', 'Group Manager', 'br-bhojpur', 'Ara, Bhojpur', 'Example listing: dance troupe for baraat, sangeet and stage show.', 1,
    ['1645264090488-a019de493023', '1663471984093-5925e87e72d5'], ['Dance', 'Baraat'], null, [
      ['Dance Troupe (6 dancers, 2 hrs)', 'डांस ग्रुप (6 डांसर, 2 घंटे)', 'dance-troupe', 28000, 'show', 0, '', '1645264090488-a019de493023'],
    ], { experienceYears: 6, languages: ['Bhojpuri', 'Hindi'], speciality: 'Stage & baraat dance' }],
  ['orchestra', 'artist', 'Sample Female Singer', 'सैंपल गायिका', 'Artist Manager', 'br-patna', 'Patna', 'Example of an individual singer profile (lokgeet, shaadi geet, Bhojpuri). Real artists add their own photo, fees and dates after registering.', 1,
    ['1768357515167-b32285450188'], ['Singer', 'Lokgeet'], null, [
      ['Live Singing (2 hrs)', 'लाइव गायन (2 घंटे)', 'singer', 22000, 'show', 0, 'With 2 musicians', '1768357515167-b32285450188'],
      ['Shaadi Geet / Lokgeet (1 hr)', 'शादी गीत / लोकगीत (1 घंटा)', 'singer', 9000, 'show', 0, '', '1768357515167-b32285450188'],
    ], { experienceYears: 9, languages: ['Bhojpuri', 'Maithili', 'Hindi'], speciality: 'Shaadi geet, lokgeet' }],
  ['orchestra', 'artist', 'Sample Comedian & Mimicry Artist', 'सैंपल कॉमेडियन व मिमिक्री', 'Artist Manager', 'up-varanasi', 'Varanasi', 'Example comedy / mimicry act for sangeet and reception.', 1,
    ['1580188928585-0ef5c1a5c4dd'], ['Comedy', 'Mimicry'], null, [
      ['Comedy Act (45 min)', 'कॉमेडी शो (45 मिनट)', 'comedy', 10000, 'show', 0, '', '1580188928585-0ef5c1a5c4dd'],
    ], { experienceYears: 7, languages: ['Hindi', 'Bhojpuri'], speciality: 'Comedy, mimicry' }],

  // ---------- Individual car owners who drive their own car (samples – real owners list via "List your car") ----------
  ['vehicle', 'owner', 'Sample Owner-Driver – Bolero', 'सैंपल मालिक-ड्राइवर – बोलेरो', 'Sample Owner-Driver (Patna)', 'br-patna', 'Danapur, Patna', 'Example of an individual car owner who drives his own car for baraat and family travel.', 0,
    ['1774670911280-c1d4a133b6a7'], ['Owner drives', 'Local routes'], null, [
      ['Mahindra Bolero (own car)', 'महिंद्रा बोलेरो (अपनी गाड़ी)', 'bolero', 3000, 'day', 1, '7 seats · Non-AC · 100 km / 12 hrs · with driver', '1774670911280-c1d4a133b6a7'],
    ], { experienceYears: 9, languages: ['Hindi', 'Bhojpuri', 'Magahi'] }],
  ['vehicle', 'owner', 'Sample Owner-Driver – Scorpio', 'सैंपल मालिक-ड्राइवर – स्कॉर्पियो', 'Sample Owner-Driver (Muzaffarpur)', 'br-muzaffarpur', 'Juran Chhapra, Muzaffarpur', 'Example listing: own Scorpio, owner drives, decoration on request.', 0,
    ['1774012697329-273cb2bb1762'], ['Owner drives', 'Decoration on request'], null, [
      ['Mahindra Scorpio AC (own car)', 'महिंद्रा स्कॉर्पियो एसी (अपनी गाड़ी)', 'scorpio', 4200, 'day', 1, '7 seats · AC · 120 km / 12 hrs · with driver', '1774012697329-273cb2bb1762'],
    ], { experienceYears: 6, languages: ['Hindi', 'Maithili', 'Bhojpuri'] }],
  ['vehicle', 'owner', 'Sample Owner-Driver – Innova', 'सैंपल मालिक-ड्राइवर – इनोवा', 'Sample Owner-Driver (Lucknow)', 'up-lucknow', 'Alambagh, Lucknow', 'Example listing: own Innova for outstation baraat and family travel.', 0,
    ['1774015671070-621920d09e0b'], ['Owner drives', 'Outstation'], null, [
      ['Toyota Innova AC (own car)', 'टोयोटा इनोवा एसी (अपनी गाड़ी)', 'innova', 5200, 'day', 1, '7 seats · AC · 150 km / 12 hrs · with driver', '1774015671070-621920d09e0b'],
    ], { experienceYears: 12, languages: ['Hindi', 'Awadhi'] }],
  // wholesale mithai: price per kg with bulk rates, and packaging boxes in every size (kind "box")
  ['sweets', '', 'Sample Siwan Mithai Wholesale', 'सैंपल सीवान मिठाई होलसेल', 'Sample Halwai (Siwan)', 'br-siwan', 'Babuniya Road, Siwan', 'Example listing: wholesale mithai for tilak, shaadi and vidai — bulk rates per kg and boxes in every size, filled and packed for you.', 0,
    ['1695568181747-f54dff1d4654', '1758910536889-43ce7b3199fd'], ['Wholesale', 'Bulk rates', 'Boxes in every size'], { available: true, charge: 200, freeAbove: 8000 }, [
      ['Motichoor Laddoo (desi ghee)', 'मोतीचूर लड्डू', 'laddoo', 440, 'kg', 400, 'Pure desi ghee', '1695568181747-f54dff1d4654', null, { minQty: 2, bulk: [[10, 420], [25, 400], [50, 380]] }],
      ['Kaju Katli', 'काजू कतली', 'kaju-katli', 960, 'kg', 150, 'With silver vark', '1758910536889-43ce7b3199fd', null, { minQty: 1, bulk: [[5, 920], [20, 880]] }],
      ['Rasgulla', 'रसगुल्ला', 'rasgulla', 260, 'kg', 300, 'Packed in tins', '1695568181440-aca4dac18650', null, { minQty: 2, bulk: [[10, 240], [30, 225]] }],
      ['Khaja (Silao style)', 'खाजा', 'khaja', 380, 'kg', 200, 'Crisp, 30-day shelf life', '1695568181440-aca4dac18650', null, { minQty: 2, bulk: [[10, 360], [25, 340]] }],
      ['Plain white box', 'सादा सफ़ेद डिब्बा', 'box-250', 6, 'box', 2000, '', '', null, { kind: 'box', boxSize: '250 g', holdsKg: 0.25, design: 'Plain white', bulk: [[200, 5], [500, 4]] }],
      ['Red & gold window box', 'लाल-सुनहरा डिब्बा', 'box-500', 12, 'box', 1500, '', '1758910536889-43ce7b3199fd', null, { kind: 'box', boxSize: '500 g', holdsKg: 0.5, design: 'Red & gold, window lid', bulk: [[100, 11], [500, 9]] }],
      ['Royal printed box', 'रॉयल प्रिंटेड डिब्बा', 'box-1kg', 28, 'box', 800, 'Your names printed on the lid', '1710857397974-f0617001c39e', null, { kind: 'box', boxSize: '1 kg', holdsKg: 1, design: 'Maroon with gold names', bulk: [[100, 25], [300, 22]] }],
      ['Velvet tray box (4 partitions)', 'मखमली ट्रे डिब्बा', 'box-tray', 55, 'box', 300, 'For mixed mithai or dry fruits', '1710857397974-f0617001c39e', null, { kind: 'box', boxSize: '4 partitions · 500 g', holdsKg: 0.5, design: 'Velvet tray', bulk: [[50, 50], [150, 45]] }],
    ]],
  // wedding card designs: front / back / inside photos, paper, printing, MOQ, bulk rates and add-ons (kind "card")
  ['cards', '', 'Sample Siwan Card Printers', 'सैंपल सीवान कार्ड प्रिंटर्स', 'Sample Printer (Siwan)', 'br-siwan', 'Station Road, Siwan', 'Example listing: shaadi cards in every budget — Hindi & English text, free proof on WhatsApp, delivered to your home.', 0,
    ['1633037773384-27d7ac0491e7'], ['Hindi & English', 'Free proof', 'Home delivery'], { available: true, charge: 100, freeAbove: 5000 }, [
      ['Budget Digital Card', 'बजट डिजिटल कार्ड', 'card-budget', 6, 'card', 30000, 'Single sheet', '', null, { kind: 'card', cardType: 'Single card', design: 'Swastik, yellow & red', paper: '250 GSM art card', printing: ['Digital'], minQty: 200, bulk: [[500, 5], [1000, 4]], addons: [['Envelope', 2]], leadDays: 3, views: { front: '1633037773384-27d7ac0491e7', back: '1789971649652-ae5dfeeaa7b4' } }],
      ['Classic Ganesh Single Card', 'गणेश सिंगल कार्ड', 'card-classic', 12, 'card', 20000, 'Single sheet + envelope', '', null, { kind: 'card', cardType: 'Single card', design: 'Ganesh ji, red & gold', paper: '300 GSM art card', printing: ['Offset'], minQty: 100, bulk: [[300, 10], [1000, 8]], addons: [['Envelope', 2], ['Extra insert page', 3]], leadDays: 4, views: { front: '1633037773384-27d7ac0491e7', back: '1710857397974-f0617001c39e' } }],
      ['Royal Peacock Folded Card', 'रॉयल मोर फोल्डेड कार्ड', 'card-peacock', 28, 'card', 10000, 'Folded, 2 inside pages', '', null, { kind: 'card', cardType: 'Folded card', design: 'Peacock, maroon & gold foil', paper: '350 GSM textured', printing: ['Offset', 'Gold foil'], minQty: 100, bulk: [[300, 25], [500, 22]], addons: [['Envelope with seal', 4], ['Ribbon', 3], ['Couple photo inside', 5]], leadDays: 6, views: { front: '1633037773384-27d7ac0491e7', back: '1710857397974-f0617001c39e', inside: ['1789971649652-ae5dfeeaa7b4', '1587271636175-90d58cdad458'] } }],
      ['Laser-cut Mandap Card', 'लेज़र कट मंडप कार्ड', 'card-laser', 45, 'card', 5000, 'Laser-cut jacket + insert', '', null, { kind: 'card', cardType: 'Laser-cut', design: 'Mandap jaali, ivory & gold', paper: 'Shimmer 300 GSM', printing: ['Digital', 'Laser cut'], minQty: 100, bulk: [[300, 40], [500, 36]], addons: [['Box packing', 15], ['Ribbon & tassel', 5]], leadDays: 7, views: { front: '1789971649652-ae5dfeeaa7b4', back: '1633037773384-27d7ac0491e7', inside: ['1587271636175-90d58cdad458'] } }],
      ['Royal Scroll Box Invite', 'रॉयल स्क्रॉल बॉक्स', 'card-scroll', 120, 'card', 2000, 'Velvet box with scroll', '', null, { kind: 'card', cardType: 'Scroll / box', design: 'Velvet box, gold scroll', paper: 'Velvet box + art paper scroll', printing: ['Screen', 'Gold foil'], minQty: 50, bulk: [[100, 110], [200, 99]], addons: [['Dry-fruit pouch', 40], ['Name tag', 5]], leadDays: 10, views: { front: '1710857397974-f0617001c39e', back: '1633037773384-27d7ac0491e7', inside: ['1789971649652-ae5dfeeaa7b4'] } }],
    ]],

  // ---------- Siwan demo set: at least one fully filled sample in every category, to try everything in one district ----------
  ['catering', 'cook', 'Sample Siwan Halwai – Ramesh Ji', 'सैंपल सीवान हलवाई – रमेश जी', 'Sample Halwai Ramesh (Siwan)', 'br-siwan', 'Mahadeva Road, Siwan', 'Example listing: traditional Bhojpuri halwai with a team of 8 — tilak, shaadi and bhoj for 100 to 1000 guests. Pure veg; desi ghee cooking on request.', 2,
    ['1721174233280-c55186b7cabc', '1742281257687-092746ad6021'], ['Pure veg', 'Desi ghee', 'Team of 8'], null, [
      ['Shaadi Bhoj – halwai team (you give ration)', 'शादी भोज – हलवाई टीम', 'halwai', 7000, 'event', 1, 'Team of 8 · cooking for 2 days', '1721174233280-c55186b7cabc', [[100, 7000], [200, 9500], [300, 12000], [500, 16000]]],
      ['Full Veg Bhoj with ration', 'राशन सहित पूरा भोज', 'bhoj', 34000, 'event', 1, 'Puri, 2 sabzi, pulao, raita, 2 mithai', '1742281257687-092746ad6021', [[100, 34000], [200, 64000], [300, 93000]]],
    ], { experienceYears: 22, languages: ['Bhojpuri', 'Hindi'], speciality: 'Bhojpuri shaadi bhoj, kaddu-puri, rasiya', laganPct: 20,
      dishes: [['Sabzi & Dal', 'Aloo dum, Kaddu ki sabzi, Shahi paneer, Chhole, Dal makhani, Mix veg'], ['Puri & Rice', 'Puri, Kachori, Jeera rice, Veg pulao'], ['Mithai', 'Gulab jamun, Rasgulla, Jalebi, Boondi, Rasiya'], ['Nashta', 'Samosa, Pakode, Chaat, Golgappa']] }],
  ['catering', 'caterer', 'Sample Siwan Caterers & Tent', 'सैंपल सीवान कैटरर्स', 'Sample Caterer (Siwan)', 'br-siwan', 'Gopalganj More, Siwan', 'Example listing: full catering with buffet counters, waiters, crockery and live chaat — for tilak, shaadi and reception.', 3,
    ['1649140041688-0f75446e707e', '1781243680771-1fea4521e196', '1630748662359-40a2105640c7'], ['Buffet', 'Live counters', 'Waiters & crockery'], null, [
      ['Veg Bhoj Thali', 'वेज भोज थाली', 'thali', 300, 'plate', 1, 'Puri, 2 sabzi, pulao, raita, mithai · min 100 plates', '1742281257687-092746ad6021'],
      ['Premium Wedding Buffet', 'प्रीमियम बुफ़े', 'buffet', 580, 'plate', 1, 'Starters, paneer, naan, 3 sweets, ice cream', '1649140041688-0f75446e707e'],
      ['Chaat & Golgappa Counter', 'चाट-गोलगप्पा काउंटर', 'chaat', 5000, 'counter', 1, 'For 300 guests', '1781243680771-1fea4521e196'],
      ['Tea & Kulhad Coffee Stall', 'चाय-कुल्हड़ कॉफ़ी स्टॉल', 'tea', 3500, 'stall', 1, 'Unlimited, 6 hours', '1630748662359-40a2105640c7'],
    ], { experienceYears: 12, languages: ['Hindi', 'Bhojpuri'], speciality: 'Buffet & live counters', laganPct: 15,
      dishes: [['Starters', 'Paneer tikka, Veg cutlet, Hara bhara kebab'], ['Main course', 'Shahi paneer, Dal makhani, Mix veg, Naan, Jeera rice'], ['Sweets', 'Gulab jamun, Rasmalai, Moong dal halwa, Ice cream']] }],
  ['ration', '', 'Sample Siwan Ration Bhandar', 'सैंपल सीवान राशन भंडार', 'Sample Shopkeeper (Siwan)', 'br-siwan', 'Main Bazar, Siwan', 'Example listing: rice, atta, oil and ghee for wedding bhoj — wholesale rates for bulk orders, delivered to the venue.', 0,
    ['1739066598279-1297113f5c6a', '1586201375761-83865001e31c'], ['Wholesale', 'Venue delivery'], { available: true, charge: 150, freeAbove: 5000 }, [
      ['Basmati Rice', 'बासमती चावल', 'rice-basmati', 92, 'kg', 600, '', '1586201375761-83865001e31c', null, { brand: 'India Gate Classic', quality: 'Premium', minQty: 5, bulk: [[25, 88], [50, 85]] }],
      ['Arwa / Sona Rice', 'अरवा चावल', 'rice-regular', 40, 'kg', 1500, '', '1686820740687-426a7b9b2043', null, { brand: 'Local Sona Masoori', quality: 'Standard', bulk: [[50, 38], [100, 36]] }],
      ['Chakki Atta', 'चक्की आटा', 'atta', 33, 'kg', 1200, '', '1714842981153-ffeaf74e7a1a', null, { brand: 'Shop chakki (fresh ground)', quality: 'Standard', bulk: [[50, 31]] }],
      ['Maida', 'मैदा', 'maida', 36, 'kg', 400, '', '', null, { brand: 'Loose', quality: 'Standard', bulk: [[25, 34]] }],
      ['Besan', 'बेसन', 'besan', 92, 'kg', 200, '', '', null, { brand: 'Rajdhani', quality: 'Premium', bulk: [[10, 88]] }],
      ['Arhar (Toor) Dal', 'अरहर दाल', 'arhar-dal', 148, 'kg', 300, '', '', null, { brand: 'Loose, double polish', quality: 'Standard', bulk: [[10, 142], [25, 138]] }],
      ['Chana Dal', 'चना दाल', 'chana-dal', 92, 'kg', 250, '', '', null, { brand: 'Loose', quality: 'Standard', bulk: [[10, 88]] }],
      ['Moong Dal', 'मूंग दाल', 'moong-dal', 118, 'kg', 150, '', '', null, { brand: 'Loose', quality: 'Standard' }],
      ['Mustard Oil (Kachi Ghani)', 'सरसों तेल', 'mustard-oil', 168, 'litre', 300, '', '1757801333068-d52a3e448cde', null, { brand: 'Fortune Kachi Ghani', quality: 'Premium', bulk: [[15, 162]] }],
      ['Refined Oil (15 L tin)', 'रिफाइंड तेल (15 ली टिन)', 'refined-oil', 2050, 'tin', 60, '15 litre tin', '1757801333068-d52a3e448cde', null, { brand: 'Fortune Soyabean', quality: 'Standard', packSize: 15, bulk: [[4, 1990]] }],
      ['Desi Ghee', 'देसी घी', 'ghee', 610, 'kg', 120, '', '1739066598279-1297113f5c6a', null, { brand: 'Sudha', quality: 'Premium', bulk: [[10, 590]] }],
      ['Sugar (Chini)', 'चीनी', 'sugar', 44, 'kg', 800, '', '', null, { brand: 'Loose', quality: 'Standard', bulk: [[50, 42]] }],
      ['Salt', 'नमक', 'salt', 22, 'kg', 300, '1 kg packets', '', null, { brand: 'Tata Salt', quality: 'Premium' }],
      ['Haldi Powder', 'हल्दी पाउडर', 'haldi', 260, 'kg', 40, '', '', null, { brand: 'MDH', quality: 'Premium' }],
      ['Red Chilli Powder', 'लाल मिर्च पाउडर', 'mirch', 320, 'kg', 40, '', '', null, { brand: 'Everest', quality: 'Premium' }],
      ['Garam Masala (100 g packet)', 'गरम मसाला', 'garam-masala', 75, 'packet', 200, '100 g packet', '', null, { brand: 'MDH', quality: 'Premium', packSize: 0.1 }],
      ['Kaju (Cashew) W320', 'काजू', 'kaju', 880, 'kg', 50, '', '', null, { brand: 'Loose W320', quality: 'Premium', bulk: [[5, 850]] }],
      ['Kishmish', 'किशमिश', 'kishmish', 380, 'kg', 40, '', '', null, { brand: 'Loose', quality: 'Standard' }],
    ]],
  ['ration', '', 'Sample Siwan Anaj Wholesale', 'सैंपल सीवान अनाज होलसेल', 'Sample Wholesaler (Siwan)', 'br-siwan', 'Anaj Mandi, Darauli Road, Siwan', 'Example listing: wholesale grain mandi — rice, atta, dal and sugar by the quintal at mandi rates; free delivery above ₹10,000.', 0,
    ['1586201375761-83865001e31c', '1761222191837-4448599c09fc'], ['Mandi rates', 'Quintal', 'Free delivery ₹10k+'], { available: true, charge: 250, freeAbove: 10000 }, [
      ['Basmati Rice (quintal)', 'बासमती चावल (क्विंटल)', 'rice-basmati', 8400, 'quintal', 20, '100 kg', '1586201375761-83865001e31c', null, { brand: 'Loose 1121 Sella', quality: 'Standard' }],
      ['Arwa Rice (quintal)', 'अरवा चावल (क्विंटल)', 'rice-regular', 3650, 'quintal', 40, '100 kg', '1686820740687-426a7b9b2043', null, { brand: 'Loose', quality: 'Economy' }],
      ['Chakki Atta (50 kg bag)', 'चक्की आटा (50 किलो)', 'atta', 1550, 'bag', 60, '50 kg bag', '1761222191837-4448599c09fc', null, { brand: 'Ashirvaad', quality: 'Premium', packSize: 50, bulk: [[4, 1500]] }],
      ['Arhar Dal (quintal)', 'अरहर दाल (क्विंटल)', 'arhar-dal', 13600, 'quintal', 10, '100 kg', '', null, { brand: 'Loose', quality: 'Economy' }],
      ['Chana Dal (30 kg bag)', 'चना दाल (30 किलो)', 'chana-dal', 2580, 'bag', 20, '30 kg bag', '', null, { brand: 'Loose', quality: 'Standard', packSize: 30 }],
      ['Sugar (50 kg bag)', 'चीनी (50 किलो)', 'sugar', 2080, 'bag', 50, '50 kg bag', '', null, { brand: 'Loose', quality: 'Standard', packSize: 50 }],
      ['Mustard Oil (15 L tin)', 'सरसों तेल (15 ली टिन)', 'mustard-oil', 2390, 'tin', 40, '15 litre tin', '1757801333068-d52a3e448cde', null, { brand: 'Engine', quality: 'Standard', packSize: 15 }],
      ['Desi Ghee (15 kg tin)', 'देसी घी (15 किलो टिन)', 'ghee', 8700, 'tin', 10, '15 kg tin', '1739066598279-1297113f5c6a', null, { brand: 'Local dairy', quality: 'Standard', packSize: 15 }],
    ]],
  ['vegetable', '', 'Sample Siwan Sabzi Mandi', 'सैंपल सीवान सब्ज़ी मंडी', 'Sample Sabziwala (Siwan)', 'br-siwan', 'Sabzi Mandi, Babuniya Road, Siwan', 'Example listing: fresh vegetables and paneer from the mandi every morning — bulk wedding orders delivered by 9 AM.', 0,
    ['1769685104379-0bedf8505586', '1769598250421-e3b7afabaf32'], ['Fresh daily', 'Delivered by 9 AM'], { available: true, charge: 100, freeAbove: 3000 }, [
      ['Potato (Aloo)', 'आलू', 'potato', 21, 'kg', 800, '', '1769685104379-0bedf8505586', null, { bulk: [[50, 19]] }],
      ['Onion (Pyaz)', 'प्याज़', 'onion', 34, 'kg', 500, '', '1769598250421-e3b7afabaf32', null, { bulk: [[50, 31]] }],
      ['Tomato', 'टमाटर', 'tomato', 29, 'kg', 300, '', '1769685104379-0bedf8505586'],
      ['Cauliflower (Gobhi)', 'गोभी', 'cauliflower', 38, 'kg', 200, '', '1769598250411-815c984c33c3'],
      ['Paneer (fresh)', 'पनीर', 'paneer', 310, 'kg', 80, 'Made today', '1769598248811-ca17f77ae65c', null, { minQty: 2, bulk: [[10, 295]] }],
      ['Green Peas (Matar)', 'हरी मटर', 'peas', 55, 'kg', 120, '', '1769598250411-815c984c33c3'],
      ['Kaddu (Pumpkin)', 'कद्दू', 'pumpkin', 24, 'kg', 300, 'For kaddu ki sabzi', '', null, { bulk: [[25, 21]] }],
    ]],
  ['studio', '', 'Sample Siwan Wedding Studio', 'सैंपल सीवान वेडिंग स्टूडियो', 'Sample Photographer (Siwan)', 'br-siwan', 'Chitragupta Nagar, Siwan', 'Example listing: traditional and candid wedding photography, cinematic film and drone — album and pen drive included.', 2,
    ['1611550287705-7ff8b459c8eb', '1629756048377-09540f52caa1', '1473968512647-3e447244af8f', '1630526720753-aa4e71acf67d'], ['Album included', 'Drone', 'Candid'], null, [
      ['Traditional Photo + Video (1 day)', 'फोटो + वीडियो (1 दिन)', 'photo-video', 20000, 'day', 1, '2 cameramen · album 40 pages · pen drive', '1611550287705-7ff8b459c8eb'],
      ['Candid + Cinematic Film (2 days)', 'कैंडिड + सिनेमैटिक फ़िल्म', 'cinematic', 48000, 'package', 1, 'Highlights film + full film + 2 albums', '1629756048377-09540f52caa1'],
      ['Drone Coverage', 'ड्रोन कवरेज', 'drone', 7000, 'event', 1, 'Baraat + jaimala', '1473968512647-3e447244af8f'],
      ['Pre-Wedding Shoot', 'प्री-वेडिंग शूट', 'prewedding', 15000, 'shoot', 1, '1 location · 1 film + 50 photos', '1630526720753-aa4e71acf67d'],
    ], { experienceYears: 10, languages: ['Hindi', 'Bhojpuri'], speciality: 'Candid & cinematic wedding films', laganPct: 25, videos: ['https://www.youtube.com/'] }],
  ['dj', '', 'Sample Siwan DJ & Sound', 'सैंपल सीवान डीजे', 'Sample DJ (Siwan)', 'br-siwan', 'J.P. Chowk, Siwan', 'Example listing: DJ for baraat, sangeet and reception — LED wall, smoke, and a baraat DJ on a decorated vehicle.', 2,
    ['1470225620780-dba8ba36b745', '1730818203797-897b2838105a'], ['LED wall', 'Baraat DJ', 'Bhojpuri hits'], null, [
      ['DJ Basic (4+4 speakers)', 'डीजे बेसिक', 'dj-basic', 8500, 'night', 1, '6 hours · DJ operator · lights', '1470225620780-dba8ba36b745'],
      ['DJ Premium (8+8, LED wall)', 'डीजे प्रीमियम', 'dj-premium', 20000, 'night', 1, 'LED wall · smoke · sharpy lights', '1574155376612-bfa4ed8aabfd'],
      ['Baraat DJ on vehicle', 'बारात डीजे गाड़ी', 'dj-baraat', 11000, 'baraat', 1, 'Decorated pickup · generator', '1730818203797-897b2838105a'],
    ], { experienceYears: 7, speciality: 'Bhojpuri & Bollywood baraat sets', laganPct: 30, videos: ['https://www.youtube.com/'] }],
  ['pandit', '', 'Sample Pt. Shiv Narayan Pandey', 'सैंपल पं. शिव नारायण पांडेय', 'Sample Pt. Shiv Narayan Pandey (Siwan)', 'br-siwan', 'Shanti Bagh, Siwan', 'Example listing: vivah sanskar, tilak, haldi-matkor and satyanarayan katha with full vidhi — kundli milan and muhurat on request.', 2,
    ['1741201864879-c5e7f81c98b0', '1764135264848-c1cbff661b50'], ['Vedic vidhi', 'Kundli milan', 'Muhurat'], null, [
      ['Vivah Sanskar (full ceremony, 2 pandits)', 'विवाह संस्कार', 'vivah', 11000, 'ceremony', 1, 'Includes kanyadaan, saat phere, sindoordaan', '1741201864879-c5e7f81c98b0'],
      ['Tilak / Chheka Puja', 'तिलक / छेका पूजा', 'tilak', 3100, 'ceremony', 1, '', '1754782915842-aa4fca6c203a'],
      ['Haldi & Matkor Puja', 'हल्दी व मटकोर पूजा', 'haldi', 2100, 'ceremony', 1, '', '1681717166573-f71589207785'],
      ['Kundli Milan (Guna Milan)', 'कुंडली मिलान', 'kundli', 501, 'report', 1, 'Written report on WhatsApp', '1777732341528-782603ab6871'],
    ], { experienceYears: 30, languages: ['Hindi', 'Bhojpuri', 'Sanskrit'], speciality: 'Vivah sanskar as per Mithila & Bhojpur paddhati' }],
  ['tent', 'tent', 'Sample Siwan Tent House', 'सैंपल सीवान टेंट हाउस', 'Sample Tent Owner (Siwan)', 'br-siwan', 'Barharia Road, Siwan', 'Example listing: shamiyana, German hangar, mandap, jaimala stage, chairs and lighting — set up and removed by our team.', 3,
    ['1744891470493-44321ef136a2', '1745573673583-a51f665ae48e', '1675376616537-c8aa9ddc9977'], ['Set-up included', 'Generator', 'Chairs & sofas'], null, [
      ['Shamiyana (40×60 ft) with darri & carpet', 'शामियाना', 'shamiyana', 12000, 'event', 1, 'Includes 100 chairs', '1744891470493-44321ef136a2'],
      ['German Hangar (per 1000 sq ft)', 'जर्मन हैंगर', 'hangar', 9000, 'event', 1, 'Waterproof · for rain', '1675376616537-c8aa9ddc9977'],
      ['Royal Red & Gold Tent Decoration', 'रॉयल टेंट सजावट', 'tent-decor', 35000, 'event', 1, 'Drapes, chandeliers, entry gate', '1745573673583-a51f665ae48e'],
      ['Jaimala Stage with Sofa', 'जयमाला स्टेज', 'stage', 15000, 'event', 1, 'Flower backdrop · couple sofa', '1605553426886-c0a99033fda0'],
      ['Jhalar Lighting + Generator', 'झालर लाइट + जनरेटर', 'lights', 8000, 'night', 1, 'Whole house & lane · 15 kVA', '1513625047154-f390b1b0df20'],
    ], { experienceYears: 18, laganPct: 25, videos: ['https://www.youtube.com/'] }],
  ['decoration', 'decor', 'Sample Siwan Phool & Decoration', 'सैंपल सीवान फूल सजावट', 'Sample Decorator (Siwan)', 'br-siwan', 'Phool Mandi, Siwan', 'Example listing: mandap, stage, gate and kohbar decoration with fresh flowers; jaimala, phool mala and doli car decoration.', 3,
    ['1789971649652-ae5dfeeaa7b4', '1790808415655-7633deb022d2', '1772127822552-ce9ef537bdcf'], ['Fresh flowers', 'Mandap & stage', 'Car decoration'], null, [
      ['Gate & Entrance Decoration', 'गेट सजावट', 'gate', 9000, 'event', 1, 'Genda + rose arch', '1790808415655-7633deb022d2'],
      ['Mandap Phool Decoration', 'मंडप फूल सजावट', 'mandap', 15000, 'event', 1, 'Fresh genda, rose, rajnigandha', '1587271636175-90d58cdad458'],
      ['Doli Car Flower Decoration', 'डोली कार सजावट', 'car-decor', 3500, 'car', 1, 'Real flowers', '1571113908007-5d6aae13d73e'],
      ['Jaimala Pair (Rose & Rajnigandha)', 'जयमाला जोड़ी', 'jaimala', 1200, 'pair', 1, 'Made fresh on the day', '1788357928572-adbdfa7f8613'],
      ['Kohbar Ghar Decoration', 'कोहबर घर सजावट', 'kohbar', 6000, 'event', 1, 'Mithila style', '1589463349208-95817c91f971'],
    ], { experienceYears: 14, speciality: 'Fresh-flower mandap & kohbar', laganPct: 30, videos: ['https://www.youtube.com/'] }],
  ['band', 'band', 'Sample Siwan Band Party', 'सैंपल सीवान बैंड पार्टी', 'Sample Band Master (Siwan)', 'br-siwan', 'Maharajganj Road, Siwan', 'Example listing: 21-member band with uniform, roshni and ghodi for baraat; shehnai and dhol-tasha on request.', 2,
    ['1774438464558-a3f4c6aad0a5', '1774438360852-92c4aba88cb6', '1774438029056-9c60141da1e4'], ['21 members', 'Roshni', 'Ghodi'], null, [
      ['Band Party (21 members) with roshni', 'बैंड पार्टी (21 सदस्य)', 'band', 25000, 'baraat', 1, 'Uniform · 20 roshni lights · 3 hours', '1774438464558-a3f4c6aad0a5'],
      ['Dhol Tasha Group', 'ढोल ताशा ग्रुप', 'dhol', 9000, 'event', 1, '8 dhol + 4 tasha', '1774438360852-92c4aba88cb6'],
      ['Shehnai Vadak', 'शहनाई वादक', 'shehnai', 5100, 'event', 1, 'For dwar puja & vidai', '1774438029056-9c60141da1e4'],
      ['Decorated Ghodi for Dulha', 'दूल्हे की घोड़ी', 'ghodi', 6000, 'baraat', 1, 'With saaz', '1588772740477-12d752619e8e'],
    ], { experienceYears: 25, speciality: 'Baraat band with roshni', laganPct: 35, videos: ['https://www.youtube.com/'] }],
  ['mehndi', '', 'Sample Mehndi Artist Priya', 'सैंपल मेहंदी आर्टिस्ट प्रिया', 'Sample Mehndi Artist Priya (Siwan)', 'br-siwan', 'Mahadeva, Siwan', 'Example listing: bridal mehndi (Arabic, Rajasthani, portrait), mehndi for guests, organic dark-colour cones.', 2,
    ['1730003873829-09b4b16444c1', '1505932794465-147d1f1b2c97', '1771992226177-759e116e72f4'], ['Organic mehndi', 'Bridal', 'Home visit'], null, [
      ['Bridal Mehndi (hands & feet)', 'दुल्हन मेहंदी', 'bridal-mehndi', 5100, 'bride', 1, 'Full hands to elbow + feet · 4–5 hours', '1730003873829-09b4b16444c1'],
      ['Mehndi for Guests (10 guests)', 'मेहमानों की मेहंदी', 'guest-mehndi', 1500, '10 guests', 1, 'Both hands, simple design', '1505932794465-147d1f1b2c97'],
      ['Natural Mehndi Cones (24)', 'मेहंदी कोन', 'cones', 480, 'pack', 1, 'Dark colour, no chemicals', '1764640848891-9b23d3632ccf'],
    ], { experienceYears: 8, languages: ['Hindi', 'Bhojpuri'], speciality: 'Rajasthani & portrait bridal mehndi', laganPct: 20, videos: ['https://www.instagram.com/'] }],
  ['makeup', 'artist', 'Sample Makeup Artist Neha', 'सैंपल मेकअप आर्टिस्ट नेहा', 'Sample Makeup Artist Neha (Siwan)', 'br-siwan', 'Station Road, Siwan', 'Example listing: bridal HD and airbrush makeup with hairstyle and saree draping — at home or the venue.', 2,
    ['1681717166573-f71589207785', '1610173827043-9db50e0d8ef9'], ['HD & airbrush', 'Hairstyle', 'Home visit'], null, [
      ['Bridal HD Makeup', 'दुल्हन एचडी मेकअप', 'bridal-hd', 12000, 'bride', 1, 'Includes hairstyle, saree / lehenga draping', '1610173827043-9db50e0d8ef9'],
      ['Airbrush Bridal Makeup', 'एयरब्रश मेकअप', 'airbrush', 18000, 'bride', 1, 'Long-lasting, waterproof', '1610173827043-9db50e0d8ef9'],
      ['Family / Party Makeup', 'परिवार मेकअप', 'party', 2000, 'person', 1, 'For mother, sisters, guests', '1681717166573-f71589207785'],
    ], { experienceYears: 6, languages: ['Hindi', 'Bhojpuri'], speciality: 'Bridal HD & airbrush', laganPct: 25, videos: ['https://www.instagram.com/'] }],
  ['makeup', 'parlour', 'Sample Siwan Beauty Parlour', 'सैंपल सीवान ब्यूटी पार्लर', 'Sample Parlour Owner (Siwan)', 'br-siwan', 'Gandhi Maidan Road, Siwan', 'Example listing: bridal packages, pre-bridal care, mehndi and makeup for the whole family at the parlour.', 4,
    ['1610173827043-9db50e0d8ef9', '1730003873829-09b4b16444c1'], ['Pre-bridal', 'Family packages'], null, [
      ['Bridal Package (makeup + hair + draping)', 'दुल्हन पैकेज', 'bridal-pack', 9000, 'bride', 1, 'At the parlour', '1610173827043-9db50e0d8ef9'],
      ['Pre-bridal Care (5 sittings)', 'प्री-ब्राइडल', 'pre-bridal', 6500, 'package', 1, 'Facial, waxing, manicure, pedicure, hair spa', '1681717166573-f71589207785'],
    ], { experienceYears: 11 }],
  ['venue', 'hall', 'Sample Siwan Marriage Hall', 'सैंपल सीवान मैरिज हॉल', 'Sample Hall Manager (Siwan)', 'br-siwan', 'NH-531, near Siwan bypass, Siwan', 'Example listing: AC hall for 500 guests with lawn, 10 rooms, parking for 60 cars, power backup and in-house decoration.', 1,
    ['1587271636175-90d58cdad458', '1605553426886-c0a99033fda0', '1772127822525-7eda37383b9f'], ['AC hall', '10 rooms', 'Parking', 'Power backup'], null, [
      ['Hall + Lawn (full day)', 'हॉल + लॉन (पूरा दिन)', 'hall-day', 85000, 'day', 1, 'Up to 500 guests · 10 rooms · parking 60 cars', '1587271636175-90d58cdad458'],
      ['Hall only (evening)', 'केवल हॉल (शाम)', 'hall-evening', 45000, 'evening', 1, 'Up to 300 guests · 4 pm to midnight', '1605553426886-c0a99033fda0'],
      ['Lawn with Fairy-light Canopy', 'लॉन कैनोपी सजावट', 'lawn', 30000, 'event', 1, 'Decoration included', '1772127822525-7eda37383b9f'],
    ], { speciality: 'Weddings for 300–500 guests', laganPct: 40, videos: ['https://www.youtube.com/'] }],
  ['wear', '', 'Sample Siwan Dulha-Dulhan Collection', 'सैंपल सीवान दूल्हा-दुल्हन कलेक्शन', 'Sample Shop Owner (Siwan)', 'br-siwan', 'Kapda Patti, Siwan', 'Example listing: sherwani on rent, bridal lehenga, Banarasi saree, maur and safa — fitting at the shop.', 0,
    ['1610173827043-9db50e0d8ef9', '1760080838961-4208536db385', '1617627143750-d86bc21e42bb'], ['Rent & buy', 'Free fitting'], { available: true, charge: 0, freeAbove: 0 }, [
      ['Sherwani on Rent (3 days)', 'शेरवानी किराये पर', 'sherwani', 3500, 'piece', 25, 'With safa & dupatta · deposit ₹2,000', '1760080838961-4208536db385'],
      ['Bridal Lehenga', 'दुल्हन लहंगा', 'lehenga', 18000, 'piece', 12, 'Red & gold, heavy work', '1610173827043-9db50e0d8ef9'],
      ['Banarasi Silk Saree', 'बनारसी साड़ी', 'banarasi', 8500, 'piece', 20, 'Pure silk, zari border', '1617627143750-d86bc21e42bb'],
      ['Dulha Maur (Bihar style)', 'दूल्हा मौर', 'maur', 1100, 'piece', 40, '', '1759906766080-82b785c61f51'],
      ['Safa / Pagdi Set (10 pcs)', 'साफ़ा सेट', 'safa', 2500, 'set', 15, 'For baraatis', '1785613590152-63d713bc94b4', null, { bulk: [[3, 2200]] }],
    ]],
  ['puja', '', 'Sample Siwan Puja Samagri Bhandar', 'सैंपल सीवान पूजा सामग्री भंडार', 'Sample Shopkeeper (Siwan)', 'br-siwan', 'Mahavir Mandir Road, Siwan', 'Example listing: complete vivah, tilak, haldi and havan kits as Pandit Ji lists them — packed and delivered.', 0,
    ['1783255166346-b7c82195ba34', '1761295908789-42feef309297'], ['Pandit Ji list', 'Home delivery'], { available: true, charge: 50, freeAbove: 1500 }, [
      ['Vivah Puja Samagri Kit (51 items)', 'विवाह पूजा सामग्री किट', 'vivah-kit', 2100, 'kit', 40, 'As per Pandit Ji’s list', '1783255166346-b7c82195ba34'],
      ['Tilak Ceremony Kit', 'तिलक किट', 'tilak-kit', 1100, 'kit', 30, '', '1761295908789-42feef309297'],
      ['Haldi Rasam Kit', 'हल्दी किट', 'haldi-kit', 650, 'kit', 30, '', '1670774837214-21b88943a6bb'],
      ['Havan Samagri & Aam Lakdi', 'हवन सामग्री', 'havan', 450, 'pack', 60, '', '1630764883473-e8c2056f0589'],
      ['Sindoordaan Kit', 'सिंदूरदान किट', 'sindoor', 350, 'kit', 40, '', '1610047614301-13c63f00c032'],
    ]],
  ['gifts', '', 'Sample Siwan Shagun & Gifts', 'सैंपल सीवान शगुन गिफ्ट्स', 'Sample Gift Shop (Siwan)', 'br-siwan', 'Station Road, Siwan', 'Example listing: dry-fruit boxes, shagun lifafa, steel gift sets and return-gift potli — bulk rates for 50+.', 0,
    ['1710857397974-f0617001c39e', '1647221598398-934ed5cb0e4f'], ['Bulk rates', 'Gift packing'], { available: true, charge: 100, freeAbove: 3000 }, [
      ['Dry Fruit Gift Box', 'ड्राई फ्रूट बॉक्स', 'dryfruit-box', 450, 'box', 200, '250 g, 4 dry fruits', '1710857397974-f0617001c39e', null, { minQty: 10, bulk: [[50, 420], [100, 395]] }],
      ['Shagun Lifafa (pack of 50)', 'शगुन लिफ़ाफ़ा', 'lifafa', 250, 'pack', 100, 'Gold printed', '1513201099705-a9746e1e201f'],
      ['Steel Bartan Gift Set', 'स्टील बर्तन सेट', 'steel-set', 1200, 'set', 50, '5 pieces', '1586969593928-1c87c1f9c2ef', null, { bulk: [[20, 1100]] }],
      ['Return Gift Potli', 'रिटर्न गिफ़्ट पोटली', 'potli', 60, 'piece', 1000, 'With mishri & elaichi', '1647221598398-934ed5cb0e4f', null, { minQty: 50, bulk: [[200, 52], [500, 45]] }],
    ]],
];

// Sample arkestra teams: [stage name, work, gender ('f' / 'm'), count]. Sample artists have no face photo (initials are shown);
// real groups add each artist's own photo in the Vendor Panel → Team.
const SAMPLE_TEAMS = {
  'Sample Orchestra Group – Patna': [['Sample Singer Puja', 'Singer', 'f', 1], ['Sample Singer Raju', 'Singer', 'm', 1], ['Sample Dancer Rani', 'Dancer', 'f', 1], ['Sample Dancer Sonam', 'Dancer', 'f', 1], ['Sample Dancer Kajal', 'Dancer', 'f', 1], ['Sample Anchor Vicky', 'Anchor', 'm', 1], ['Band musicians', 'Musician', 'm', 3], ['Sound & light crew', 'Sound & lights', 'm', 2]],
  'Sample Musical Night – Gorakhpur': [['Sample Singer Neha', 'Singer', 'f', 1], ['Sample Singer Amit', 'Singer', 'm', 1], ['Sample Dancer Priya', 'Dancer', 'f', 1], ['Sample Dancer Nisha', 'Dancer', 'f', 1], ['Band musicians', 'Musician', 'm', 3], ['Sound crew', 'Sound & lights', 'm', 1]],
  'Sample Bhojpuri Arkestra – Siwan': [['Sample Singer Khushboo', 'Singer', 'f', 1], ['Sample Singer Bablu', 'Singer', 'm', 1], ['Sample Dancer Pinki', 'Dancer', 'f', 1], ['Sample Dancer Rinki', 'Dancer', 'f', 1], ['Sample Dancer Muskan', 'Dancer', 'f', 1], ['Sample Dancer Anjali', 'Dancer', 'f', 1], ['Sample Anchor Golu', 'Anchor', 'm', 1], ['Sample Comedian Chhotu', 'Comedian', 'm', 1], ['Band musicians', 'Musician', 'm', 4], ['LED & sound crew', 'Sound & lights', 'm', 2]],
  'Sample Musical Arkestra – Chhapra': [['Sample Singer Shivani', 'Singer', 'f', 1], ['Sample Singer Manoj', 'Singer', 'm', 1], ['Sample Dancer Roshni', 'Dancer', 'f', 1], ['Sample Dancer Simran', 'Dancer', 'f', 1], ['Sample Comedian Pappu', 'Comedian', 'm', 1], ['Band musicians', 'Musician', 'm', 3], ['Sound crew', 'Sound & lights', 'm', 2]],
  'Sample Jagran & Bhakti Party – Gaya': [['Sample Bhajan Singer Sushma', 'Singer', 'f', 1], ['Sample Bhajan Singer Ramesh', 'Singer', 'm', 1], ['Sample Jhanki Artist', 'Jhanki artist', 'f', 2], ['Dholak, harmonium & octopad', 'Musician', 'm', 3], ['Sound crew', 'Sound & lights', 'm', 1]],
  'Sample Dance Troupe – Ara': [['Sample Dancer Kiran', 'Dancer', 'f', 1], ['Sample Dancer Mona', 'Dancer', 'f', 1], ['Sample Dancer Reena', 'Dancer', 'f', 1], ['Sample Dancer Sapna', 'Dancer', 'f', 1], ['Sample Dancer Rahul', 'Dancer', 'm', 1], ['Sample Dancer Sunny', 'Dancer', 'm', 1], ['Choreographer', 'Choreographer', 'm', 1]],
};

// Sample reviews (marked sample) so the rating & review features can be seen before real customers review
const SAMPLE_REVIEWS = [
  [0, 5, 'Scorpio was clean and the driver was on time for baraat.'], [0, 4, 'Good service, decoration could be better.'],
  [5, 5, 'Khana bahut accha tha, sab mehmaan khush.'], [5, 4, 'Live counters were great.'],
  [8, 4, 'Good rates for bulk rice and oil.'], [11, 5, 'Fresh sabzi delivered early morning.'],
  [14, 5, 'Khaja was fresh, boxes printed nicely.'], [17, 5, 'Beautiful candid photos and quick delivery.'],
  [20, 4, 'Sound was very good, lights excellent.'], [22, 5, 'Pandit ji explained every rasam patiently.'],
];

// Sample calendars: a few dates already booked (busy lagan days) and one day closed, different per vendor
function sampleDates(i, todayStr) {
  const base = new Date(todayStr + 'T00:00:00Z');
  const at = n => { const d = new Date(base); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const busy = [2, 4, 6, 9, 11, 13, 16, 19, 21, 24, 27, 30, 33, 37, 40, 44, 48, 52, 57];
  return { bookedDates: busy.filter((_, k) => (k + i) % 3 !== 1).filter((_, k) => k % 2 === 0).map(at), blockedDates: [at(8 + (i * 5) % 40)] };
}

// Shops that sell goods from stock (no closed dates; listing qty = stock)
const STOCK_TYPES = ['ration', 'vegetable', 'sweets', 'cards', 'wear', 'puja', 'gifts'];

// Extra fields of a sample listing: bulk rates, minimum order, packaging box details, card design details
function listingExtra(lx) {
  if (!lx) return {};
  const out = { ...lx };
  if (lx.bulk) { out.bulkTiers = lx.bulk.map(([min, price]) => ({ min, price })); delete out.bulk; }
  if (lx.addons) out.addons = lx.addons.map(([name, price]) => ({ name, price }));
  if (lx.views) {
    // card photos: front (cover), back and inside pages
    const big = id => photo(id, 800, 600);
    out.cardViews = { front: big(lx.views.front), back: lx.views.back ? big(lx.views.back) : '', inside: (lx.views.inside || []).map(big) };
    out.photos = [out.cardViews.front, out.cardViews.back, ...out.cardViews.inside].filter(Boolean);
    out.photo = out.photos[0];
    delete out.views;
  }
  return out;
}

// Head post office pincode of each district that has sample vendors
const SAMPLE_PINCODE = { 'br-patna': '800001', 'br-siwan': '841226', 'br-gaya': '823001', 'br-darbhanga': '846004', 'br-bhagalpur': '812001', 'br-muzaffarpur': '842001', 'br-begusarai': '851101', 'br-saran': '841301', 'br-bhojpur': '802301', 'up-varanasi': '221001', 'up-gorakhpur': '273001', 'up-lucknow': '226001', 'up-prayagraj': '211001' };

// Sample shop / home pin: 1–8 km around the district HQ, spread out so distances differ
function samplePin(district, i) {
  const c = districtGeo(district);
  if (!c) return {};
  const r = (1 + (i * 37) % 8) / 111, a = i * 2.39996; // ~111 km per degree; golden-angle spread
  return { lat: Math.round((c.lat + r * Math.sin(a)) * 1e5) / 1e5, lng: Math.round((c.lng + r * Math.cos(a) / Math.cos(c.lat * Math.PI / 180)) * 1e5) / 1e5 };
}

function buildVendorSeed(nowIso, todayStr) {
  const vendors = [], vlistings = [], vreviews = [];
  V.forEach(([type, subtype, name, nameHi, owner, district, address, about, capacity, photos, tags, delivery, items, extra], i) => {
    const id = 'v_s' + String(i + 1).padStart(2, '0');
    const phone = '90000' + String(10001 + i).padStart(5, '0');
    vendors.push({
      id, type, subtype, name, nameHi, owner, phone, whatsapp: phone, address, district, pincode: SAMPLE_PINCODE[district] || '', ...samplePin(district, i), about,
      photos: photos.map(p => photo(VENDOR_PHOTO_FIXES[p] || p)), videos: (extra && extra.videos) || [], tags,
      // sample people get no face photo (an initials avatar is shown); real vendors upload their own
      laganPct: (extra && extra.laganPct) || 0,
      profilePhoto: '', experienceYears: (extra && extra.experienceYears) || 0, languages: (extra && extra.languages) || [], speciality: (extra && extra.speciality) || '',
      dishes: ((extra && extra.dishes) || []).map(([group, list]) => ({ group, items: list.split(', ') })),
      team: (SAMPLE_TEAMS[name] || []).map(([mname, role, g, count], k) => ({ id: `tm_${id}_${k + 1}`, name: mname, role, gender: g === 'f' ? 'female' : 'male', count, photo: '' })),
      verified: true, active: true, sample: true, status: 'active', capacityPerDay: capacity || 1, openDays: [0, 1, 2, 3, 4, 5, 6],
      // goods shops (ration, sabzi, mithai) are open daily; services get sample booked / closed dates
      ...(STOCK_TYPES.includes(type) ? { blockedDates: [], bookedDates: [] } : sampleDates(i, todayStr)),
      delivery: delivery || { available: false, charge: 0, freeAbove: 0 }, stockUpdated: type === 'vegetable' ? todayStr : '', userId: null, createdAt: nowIso,
    });
    items.forEach(([lname, lnameHi, item, price, unit, qty, specs, ph, tiers, lx], j) => {
      const unitMode = type === 'vehicle';
      const stockMode = STOCK_TYPES.includes(type);
      const guestTiers = (tiers || []).map(([guests, p]) => ({ guests, price: p }));
      const pid = listingPhotoId(lname, ph);
      vlistings.push({ id: `${id}_l${j + 1}`, vendorId: id, name: lname, nameHi: lnameHi, item, price: guestTiers.length ? guestTiers[0].price : price, unit, stock: stockMode ? qty : 0, units: unitMode ? qty : 1, photo: pid ? photo(pid, 400, 300) : '', specs, guestTiers, active: true, createdAt: nowIso, ...listingExtra(lx) });
    });
  });
  SAMPLE_REVIEWS.forEach(([vi, rating, text], k) => vreviews.push({ id: 'rv_s' + (k + 1), vendorId: vendors[vi].id, bookingId: '', name: 'Sample', district: '', rating, text, reply: '', status: 'published', verified: false, sample: true, createdAt: nowIso }));
  return { vendors, vlistings, vreviews };
}

// Sample rental components for the Tent Booking page, per vendor type (only ever added to sample vendors).
// [name, nameHi, category, price, unit, units owned, size, features[], specs, photoId ('' = category emoji), minQty]
const SAMPLE_RENTALS = {
  tent: [
    ['Shamiyana (40×60 ft)', 'शामियाना (40×60 फ़ीट)', 'tent', 6500, 'day', 4, '40×60 ft', ['Printed cotton', 'Bamboo poles included', 'Set-up & removal'], 'For 250–300 guests', '1744891470493-44321ef136a2'],
    ['Pandal (30×40 ft)', 'पंडाल (30×40 फ़ीट)', 'tent', 4000, 'day', 6, '30×40 ft', ['Printed cloth', 'For 150 guests'], '', '1745573673583-a51f665ae48e'],
    ['German Hangar (per 1000 sq ft)', 'जर्मन हैंगर', 'tent', 9000, '1000 sq ft', 6, '1000 sq ft', ['Waterproof', 'Aluminium frame', 'Wind safe'], 'Join pieces for a bigger hall', '1675376616537-c8aa9ddc9977'],
    ['Waterproof Tent (20×20 ft)', 'वाटरप्रूफ टेंट', 'tent', 2500, 'day', 8, '20×20 ft', ['PVC roof', 'For kitchen / store'], '', '1675376616537-c8aa9ddc9977'],
    ['Bamboo Bally (12 ft)', 'बाँस बल्ली (12 फ़ीट)', 'poles', 15, 'piece', 600, '12 ft', ['Seasoned bamboo'], 'Extra kanaat or mandap', ''],
    ['Iron Pipe Frame Set (20 ft span)', 'लोहे का फ्रेम सेट', 'poles', 1200, 'set', 10, '20 ft span', ['Nut-bolt joints', 'Base plates'], '', ''],
    ['Kanaat Side Wall (15 ft)', 'कनात (15 फ़ीट)', 'fabric', 60, 'piece', 400, '15×7 ft', ['Red-yellow print', 'With ropes'], '', '', 10],
    ['Ceiling Drape Set (white / pink)', 'छत ड्रेप सेट', 'fabric', 900, 'set', 20, 'for 30×40 ft', ['Satin', 'Pleated'], '', '1775476793931-cb484f197760'],
    ['Red Carpet (per 100 sq ft)', 'लाल कालीन (100 वर्ग फ़ीट)', 'carpet', 250, '100 sq ft', 80, '100 sq ft', ['Velvet finish'], 'Stage path & entry', ''],
    ['Darri / Jajam (10×15 ft)', 'दरी / जाजम', 'carpet', 80, 'piece', 150, '10×15 ft', ['Cotton', 'Washed'], 'Floor seating & pangat', ''],
    ['Plastic Chair with Cover', 'प्लास्टिक कुर्सी (कवर सहित)', 'chairs', 12, 'piece', 800, '', ['White cover', 'Ribbon bow'], '', '1707333514312-39cf7658479c', 50],
    ['Cushion Banquet Chair', 'कुशन कुर्सी', 'chairs', 35, 'piece', 300, '', ['Cushioned', 'Gold / maroon frame'], '', '1707333514312-39cf7658479c', 20],
    ['Maharaja Chair', 'महाराजा कुर्सी', 'chairs', 600, 'piece', 20, '', ['Carved', 'Velvet seat'], 'For elders on the stage', '1605553426886-c0a99033fda0'],
    ['Round Dining Table (5 ft)', 'गोल डाइनिंग टेबल', 'tables', 150, 'piece', 60, '5 ft · 8 guests', ['Table cloth', 'Frill skirting'], '', '1775476793931-cb484f197760'],
    ['Buffet Counter Table (6 ft)', 'बुफ़े काउंटर टेबल', 'tables', 200, 'piece', 30, '6×2.5 ft', ['Skirting', 'Steel top'], '', ''],
    ['Jaimala Stage (16×12 ft)', 'जयमाला स्टेज', 'stage', 8000, 'event', 3, '16×12 ft · 3 ft high', ['Carpeted', 'Steps both sides', 'Backdrop frame'], '', '1745573673416-66e829644ae9'],
    ['Vivah Mandap (10×10 ft)', 'विवाह मंडप', 'stage', 5500, 'event', 4, '10×10 ft', ['Bamboo & kalash', 'Aam patta & genda'], '', '1587271636175-90d58cdad458'],
    ['Royal Couple Sofa', 'दूल्हा-दुल्हन सोफ़ा', 'sofa', 2500, 'piece', 4, '3 seater', ['Gold carved', 'Red velvet'], '', '1605553426886-c0a99033fda0'],
    ['Lounge Sofa Set (3+1+1)', 'लाउंज सोफ़ा सेट', 'sofa', 1800, 'set', 6, '3+1+1 with table', ['White leatherette'], 'For guests & reception', '1605553426886-c0a99033fda0'],
    ['Jhalar Light (50 m)', 'झालर लाइट (50 मीटर)', 'lighting', 300, 'piece', 60, '50 m', ['Multi-colour LED'], 'House & lane', '1513625047154-f390b1b0df20'],
    ['Halogen Focus Light (500 W)', 'हैलोजन लाइट', 'lighting', 150, 'piece', 40, '500 W', ['With stand'], '', '1513625047154-f390b1b0df20'],
    ['Crystal Chandelier', 'क्रिस्टल झूमर', 'lighting', 1500, 'piece', 12, '3 ft', ['Warm white'], '', '1723832348105-2e69f948135a'],
    ['Fairy-light Pathway (20 ft)', 'लाइट पाथवे (20 फ़ीट)', 'lighting', 1200, 'piece', 10, '20 ft', ['Arches', 'Warm white'], '', '1607861884586-c7cfaed16290'],
    ['Silent Generator 25 kVA', 'साइलेंट जनरेटर 25 kVA', 'generator', 6500, 'day', 3, '25 kVA', ['Diesel 8 hrs', 'Operator', 'Silent canopy'], '', ''],
    ['Generator 10 kVA', 'जनरेटर 10 kVA', 'generator', 3500, 'day', 4, '10 kVA', ['Diesel 6 hrs', 'Operator'], '', ''],
    ['Pedestal Fan', 'स्टैंड पंखा', 'other', 150, 'piece', 50, '24 inch', ['Extension board'], '', ''],
    ['Desert Cooler', 'डेज़र्ट कूलर', 'other', 400, 'piece', 20, '', ['Water filled'], 'Summer weddings', ''],
  ],
  decoration: [
    ['Entry Gate Arch (flower & drape)', 'एंट्री गेट (फूल व ड्रेप)', 'decoration', 6000, 'piece', 4, '12 ft wide', ['Drapes', 'Flowers', 'Lights'], '', '1790808415655-7633deb022d2'],
    ['Stage Backdrop Flower Wall', 'स्टेज बैकड्रॉप फूल दीवार', 'decoration', 9000, 'set', 3, '16×10 ft', ['Rose & orchid wall', 'Name board'], '', '1789971649652-ae5dfeeaa7b4'],
    ['Lawn Canopy & Drape Set', 'लॉन कैनोपी व ड्रेप', 'decoration', 7500, 'set', 3, 'for 40×40 ft', ['Pastel drapes', 'Fairy lights'], '', '1772127822525-7eda37383b9f'],
    ['Selfie Booth / Photo Frame', 'सेल्फ़ी बूथ', 'decoration', 2500, 'piece', 3, '8×8 ft', ['Name & date print'], '', ''],
    ['Genda Phool Ladi (10 strings)', 'गेंदा फूल लड़ी (10)', 'flowers', 450, '10 strings', 40, '6 ft each', ['Fresh on the day'], '', '1789971649652-ae5dfeeaa7b4'],
    ['Jaimala Pair (rose & rajnigandha)', 'जयमाला जोड़ी', 'flowers', 1200, 'pair', 15, '', ['Fresh', 'Made on the day'], '', '1788357928572-adbdfa7f8613'],
    ['Table Flower Centrepiece', 'टेबल फूल सजावट', 'flowers', 250, 'piece', 80, '', ['Rose & gypsy'], '', ''],
    ['Rose Petals', 'गुलाब की पंखुड़ियाँ', 'flowers', 300, 'kg', 30, '', ['Welcome & jaimala'], '', ''],
  ],
  dj: [
    ['DJ Speaker Set (4 top + 4 bass)', 'डीजे स्पीकर सेट', 'sound', 6000, 'set', 2, '4+4 · 10,000 W', ['Mixer', 'Operator'], '', '1470225620780-dba8ba36b745'],
    ['Wireless Mic', 'वायरलेस माइक', 'sound', 300, 'piece', 8, '', ['Batteries included'], 'Jaimala, speeches & anchoring', ''],
    ['Sharpy Moving-head Light', 'शार्पी लाइट', 'sound', 700, 'piece', 12, '', ['DMX controlled'], '', '1574155376612-bfa4ed8aabfd'],
    ['Smoke Machine', 'स्मोक मशीन', 'sound', 1500, 'piece', 2, '', ['Fluid included'], 'Couple entry', ''],
    ['LED Video Wall (10 sq ft)', 'एलईडी वॉल (10 वर्ग फ़ीट)', 'sound', 1200, '10 sq ft', 20, 'P3.9 panels', ['HDMI', 'Operator'], '', ''],
  ],
};
// delivery / transport charge the sample rental vendors start with
const SAMPLE_RENTAL_DELIVERY = { tent: { available: true, charge: 1500, freeAbove: 60000 }, decoration: { available: true, charge: 500, freeAbove: 20000 }, dj: { available: true, charge: 800, freeAbove: 0 } };
function sampleRentals(v, nowIso) {
  return (SAMPLE_RENTALS[v.type] || []).map(([name, nameHi, category, price, unit, units, size, features, specs, ph, minQty], j) => {
    const pid = listingPhotoId(name, ph), p = pid ? photo(pid, 800, 600) : '';
    return { id: `${v.id}_r${j + 1}`, vendorId: v.id, name, nameHi, item: '', rental: true, category, size, features, specs, price, unit, units, stock: 0, minQty: minQty || 0, photo: p, photos: p ? [p] : [], guestTiers: [], active: true, createdAt: nowIso };
  });
}

module.exports = { buildVendorSeed, sampleRentals, SAMPLE_RENTAL_DELIVERY, LISTING_PHOTOS, VENDOR_PHOTO_FIXES, photo };
