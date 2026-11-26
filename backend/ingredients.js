// Wedding cooking ingredients: one shared list so the same item can be compared across shops
// and the ration planner can estimate quantities. `per100` = rough quantity for a veg shaadi bhoj
// for 100 guests (puri-sabzi, dal, pulao, raita, 2 mithai, tea) — customers can change every number.
// [key, name, Hindi name, group, unit, per100]
const LIST = [
  ['rice-basmati', 'Basmati Rice', 'बासमती चावल', 'Rice & Flour', 'kg', 8],
  ['rice-regular', 'Arwa / Sona Rice', 'अरवा चावल', 'Rice & Flour', 'kg', 10],
  ['atta', 'Chakki Atta', 'चक्की आटा', 'Rice & Flour', 'kg', 12],
  ['maida', 'Maida', 'मैदा', 'Rice & Flour', 'kg', 5],
  ['besan', 'Besan', 'बेसन', 'Rice & Flour', 'kg', 3],
  ['suji', 'Suji / Rava', 'सूजी', 'Rice & Flour', 'kg', 2],
  ['arhar-dal', 'Arhar (Toor) Dal', 'अरहर दाल', 'Pulses', 'kg', 3],
  ['chana-dal', 'Chana Dal', 'चना दाल', 'Pulses', 'kg', 2],
  ['moong-dal', 'Moong Dal', 'मूंग दाल', 'Pulses', 'kg', 1.5],
  ['urad-dal', 'Urad Dal', 'उड़द दाल', 'Pulses', 'kg', 1],
  ['kabuli-chana', 'Kabuli Chana', 'काबुली चना', 'Pulses', 'kg', 2],
  ['mustard-oil', 'Mustard Oil', 'सरसों तेल', 'Oil & Ghee', 'litre', 4],
  ['refined-oil', 'Refined Oil', 'रिफाइंड तेल', 'Oil & Ghee', 'litre', 12],
  ['ghee', 'Desi Ghee', 'देसी घी', 'Oil & Ghee', 'kg', 2],
  ['sugar', 'Sugar (Chini)', 'चीनी', 'Sugar, Salt & Tea', 'kg', 10],
  ['salt', 'Salt', 'नमक', 'Sugar, Salt & Tea', 'kg', 2],
  ['tea', 'Tea Leaves', 'चायपत्ती', 'Sugar, Salt & Tea', 'kg', 0.5],
  ['haldi', 'Haldi Powder', 'हल्दी पाउडर', 'Spices', 'kg', 0.3],
  ['mirch', 'Red Chilli Powder', 'लाल मिर्च पाउडर', 'Spices', 'kg', 0.4],
  ['dhaniya', 'Dhaniya Powder', 'धनिया पाउडर', 'Spices', 'kg', 0.4],
  ['jeera', 'Jeera', 'जीरा', 'Spices', 'kg', 0.25],
  ['garam-masala', 'Garam Masala', 'गरम मसाला', 'Spices', 'kg', 0.2],
  ['kaju', 'Kaju (Cashew)', 'काजू', 'Dry Fruits', 'kg', 1],
  ['kishmish', 'Kishmish (Raisins)', 'किशमिश', 'Dry Fruits', 'kg', 0.5],
  ['badam', 'Badam (Almonds)', 'बादाम', 'Dry Fruits', 'kg', 0.5],
  ['potato', 'Potato (Aloo)', 'आलू', 'Vegetables & Paneer', 'kg', 15],
  ['onion', 'Onion (Pyaz)', 'प्याज़', 'Vegetables & Paneer', 'kg', 6],
  ['tomato', 'Tomato', 'टमाटर', 'Vegetables & Paneer', 'kg', 6],
  ['cauliflower', 'Cauliflower (Gobhi)', 'गोभी', 'Vegetables & Paneer', 'kg', 6],
  ['peas', 'Green Peas (Matar)', 'मटर', 'Vegetables & Paneer', 'kg', 3],
  ['pumpkin', 'Kaddu (Pumpkin)', 'कद्दू', 'Vegetables & Paneer', 'kg', 8],
  ['paneer', 'Paneer', 'पनीर', 'Vegetables & Paneer', 'kg', 8],
];
const INGREDIENTS = LIST.map(([key, name, hi, group, unit, per100]) => ({ key, name, hi, group, unit, per100 }));
const GROUPS = [...new Set(INGREDIENTS.map(i => i.group))];
const ING = Object.fromEntries(INGREDIENTS.map(i => [i.key, i]));
const QUALITIES = ['Economy', 'Standard', 'Premium'];
// how many base units (kg / litre) one selling unit holds: 1 quintal = 100 kg; packets carry their own size
function packSize(l) {
  if (l.packSize > 0) return l.packSize;
  const u = String(l.unit || '').toLowerCase();
  return u === 'quintal' ? 100 : u === 'g' || u === 'gram' ? 0.001 : 1;
}
module.exports = { INGREDIENTS, GROUPS, ING, QUALITIES, packSize };
