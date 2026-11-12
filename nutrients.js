/* KitchenShare - nutrient database + per-recipe nutrition calculator.
   Pure data module; no dependencies. Exposes window.ksNutrition.
   Values are approximate per-100g (USDA-style) and are meant for a prototype. */
(function () {
  'use strict';

  var N = {};

  function food(kcal, fat, pro, fib, extra) {
    var f = { kcal: kcal, fat: fat, pro: pro, fib: fib };
    if (extra) {
      for (var k in extra) { if (extra.hasOwnProperty(k)) f[k] = extra[k]; }
    }
    return f;
  }

  N.water = food(0, 0, 0, 0);
  N.salt = food(0, 0, 0, 0);
  N.oil = food(884, 100, 0, 0, { density: 0.92, tbsp: 14, tsp: 4.5 });
  N.coconut_oil = food(892, 100, 0, 0, { density: 0.92, tbsp: 14, tsp: 4.5 });
  N.butter = food(717, 81, 0.9, 0, { piece: 10, tbsp: 14 });
  N.ghee = food(900, 100, 0, 0, { tbsp: 14 });
  N.sugar = food(387, 0, 0, 0, { cup: 200, tbsp: 12, tsp: 4 });
  N.honey = food(304, 0, 0.3, 0.2, { density: 1.4, tbsp: 21, tsp: 7 });
  N.flour = food(364, 1, 10, 2.7, { cup: 120 });
  N.pasta = food(371, 1.5, 13, 3.8, { cup: 120 });
  N.noodles = food(384, 4, 11, 3);
  N.rice_raw = food(365, 0.7, 7.1, 3.5, { cup: 185 });
  N.rice_cooked = food(130, 0.3, 2.7, 0.4, { cup: 195 });
  N.semolina = food(360, 1.3, 12.7, 3.9, { cup: 160 });
  N.oats = food(389, 6.9, 16.9, 10.6, { cup: 80 });
  N.quinoa = food(368, 6.1, 14.1, 7, { cup: 170 });
  N.besan = food(387, 6.7, 22.4, 10.8, { cup: 92 });
  N.bread = food(265, 3.2, 9, 2.7, { piece: 30 });
  N.puff_pastry = food(558, 37, 7, 2.1);
  N.egg = food(143, 9.5, 12.6, 0, { piece: 50 });
  N.milk = food(42, 1, 3.4, 0, { density: 1.03, cup: 244 });
  N.yogurt = food(61, 3.3, 3.5, 0, { cup: 245 });
  N.cream = food(340, 36, 2.8, 0, { density: 1, cup: 240 });
  N.coconut_milk = food(230, 24, 2.3, 0.2, { density: 0.93, cup: 226 });
  N.cheese_cheddar = food(403, 33, 25, 0);
  N.cheese = food(403, 33, 25, 0);
  N.parmesan = food(431, 29, 38, 0);
  N.mozzarella = food(280, 17, 28, 0);
  N.paneer = food(321, 25, 18, 0);
  N.feta = food(264, 21, 14, 0);
  N.cream_cheese = food(342, 34, 6, 0);
  N.sour_cream = food(198, 19, 2.9, 0, { cup: 240 });
  N.mayonnaise = food(680, 75, 1, 0, { tbsp: 14 });
  N.chicken = food(165, 3.6, 31, 0);
  N.chicken_thigh = food(209, 15, 18, 0);
  N.beef = food(250, 15, 26, 0);
  N.beef_mince = food(260, 18, 23, 0);
  N.pork = food(242, 14, 27, 0);
  N.salmon = food(208, 13, 20, 0, { filet: 150 });
  N.tuna = food(132, 1, 28, 0);
  N.shrimp = food(99, 0.3, 24, 0, { piece: 5 });
  N.fish_white = food(90, 0.7, 20, 0, { filet: 150 });
  N.bacon = food(541, 42, 37, 0);
  N.sausage = food(301, 25, 18, 0, { piece: 45 });
  N.tofu = food(76, 4.8, 8, 0.3, { block: 250 });
  N.tomato = food(18, 0.2, 0.9, 1.2, { piece: 120 });
  N.tomato_paste = food(82, 0.5, 4.3, 2.1, { tbsp: 16 });
  N.ketchup = food(101, 0.1, 1.2, 0.5, { tbsp: 15 });
  N.onion = food(40, 0.1, 1.1, 1.7, { piece: 110 });
  N.garlic = food(149, 0.5, 6.4, 2.1, { piece: 4 });
  N.ginger = food(80, 0.8, 1.8, 2, { piece: 10 });
  N.carrot = food(41, 0.2, 0.9, 2.8, { piece: 61 });
  N.celery = food(16, 0.2, 0.7, 1.6, { piece: 40 });
  N.cucumber = food(15, 0.1, 0.65, 0.5, { piece: 120 });
  N.spinach = food(23, 0.4, 2.9, 2.2);
  N.lettuce = food(15, 0.2, 1.4, 1.3);
  N.arugula = food(25, 0.7, 2.6, 1.6);
  N.basil = food(23, 0.6, 3.2, 1.6, { bunch: 30 });
  N.cilantro = food(23, 0.5, 2.1, 2.8, { bunch: 30 });
  N.mint = food(44, 0.7, 3.3, 8, { bunch: 30 });
  N.oregano = food(306, 4.3, 11, 43);
  N.thyme = food(101, 1.7, 5.6, 14);
  N.rosemary = food(131, 5.9, 3.3, 14);
  N.bay_leaf = food(313, 8.4, 7.6, 26);
  N.cumin = food(375, 22, 17.8, 10.5, { tbsp: 6, tsp: 2 });
  N.pepper = food(251, 3.3, 10.4, 25.3, { tbsp: 7, tsp: 2.3 });
  N.chilli = food(40, 0.4, 1.9, 1.5, { piece: 5 });
  N.chilli_flakes = food(282, 14, 13, 27, { tbsp: 6 });
  N.paprika = food(282, 13, 14, 35, { tbsp: 7 });
  N.turmeric = food(354, 10, 7.8, 21, { tbsp: 7 });
  N.curry_leaves = food(108, 1, 6, 18, { bunch: 20 });
  N.coriander_seed = food(298, 17.8, 12.4, 41, { tbsp: 6 });
  N.mustard_seed = food(508, 36, 26, 12, { tbsp: 9 });
  N.fenugreek = food(323, 6.4, 23, 24.6, { tbsp: 11 });
  N.cinnamon = food(247, 1.2, 4, 53, { tbsp: 8 });
  N.cloves = food(274, 13, 6, 34, { tbsp: 6 });
  N.cardamom = food(311, 6.7, 10.8, 28);
  N.sambar_powder = food(280, 10, 12, 20, { tbsp: 8 });
  N.rasam_powder = food(300, 12, 13, 22, { tbsp: 8 });
  N.chettinad_masala = food(300, 15, 14, 20, { tbsp: 8 });
  N.garam_masala = food(280, 12, 13, 20, { tbsp: 7 });
  N.ginger_garlic_paste = food(90, 0.6, 3, 1.5, { tbsp: 16 });
  N.tamarind = food(239, 0.6, 2.8, 5.1, { tbsp: 16 });
  N.dal = food(331, 1.1, 24, 10.8, { cup: 200 });
  N.chickpeas = food(139, 2.6, 7.1, 6.4, { cup: 164 });
  N.chickpeas_dry = food(364, 6, 19, 17, { cup: 200 });
  N.beans = food(132, 0.5, 8.7, 5.5, { cup: 170 });
  N.kidney_beans = food(127, 0.5, 8.7, 6.4, { cup: 177 });
  N.peas = food(81, 0.4, 5.4, 5.7, { cup: 145 });
  N.corn = food(86, 1.4, 3.3, 2, { cup: 145 });
  N.lentil_cooked = food(116, 0.4, 9, 7.9, { cup: 198 });
  N.potato = food(77, 0.1, 2, 2.2, { piece: 170 });
  N.sweet_potato = food(86, 0.1, 1.6, 3, { piece: 130 });
  N.mushroom = food(22, 0.3, 3.1, 1, { piece: 20 });
  N.bell_pepper = food(26, 0.3, 1, 1.8, { piece: 120 });
  N.eggplant = food(25, 0.2, 1, 3, { piece: 200 });
  N.zucchini = food(17, 0.3, 1.2, 1, { piece: 150 });
  N.broccoli = food(34, 0.4, 2.8, 2.6, { piece: 90 });
  N.cauliflower = food(25, 0.3, 1.9, 2, { piece: 300 });
  N.cabbage = food(25, 0.1, 1.3, 2.5, { piece: 200 });
  N.green_beans = food(31, 0.2, 1.8, 3.4, { cup: 100 });
  N.avocado = food(160, 14.7, 2, 6.7, { piece: 150 });
  N.lemon = food(29, 0.3, 1.1, 2.8, { piece: 60 });
  N.lime = food(30, 0.2, 0.7, 2.8, { piece: 45 });
  N.lemon_juice = food(22, 0.2, 0.4, 0.3, { tbsp: 15 });
  N.apple = food(52, 0.2, 0.3, 2.4, { piece: 180 });
  N.banana = food(89, 0.3, 1.1, 2.6, { piece: 118 });
  N.mango = food(60, 0.4, 0.8, 1.6, { piece: 200 });
  N.strawberry = food(32, 0.3, 0.7, 2, { piece: 15 });
  N.blueberry = food(57, 0.3, 0.7, 2.4, { cup: 148 });
  N.peanut = food(567, 49, 25.8, 8.5, { cup: 146 });
  N.peanut_butter = food(588, 50, 25, 6, { tbsp: 16 });
  N.almond = food(579, 50, 21, 12.5, { piece: 1, cup: 92 });
  N.cashew = food(553, 44, 18, 3.3, { cup: 130 });
  N.walnut = food(654, 65, 15, 6.7, { cup: 100 });
  N.coconut = food(354, 33, 3.3, 9, { cup: 80 });
  N.olives = food(145, 15, 1, 3.2, { piece: 5 });
  N.maple_syrup = food(260, 0.1, 0, 0, { density: 1.33, tbsp: 20 });
  N.chocolate_dark = food(546, 31, 4.9, 11, { piece: 10 });
  N.cocoa = food(228, 14, 20, 37, { tbsp: 11 });
  N.vanilla = food(288, 0.1, 0.1, 0, { tbsp: 13 });
  N.baking_powder = food(53, 0, 0, 0.2, { tsp: 4 });
  N.baking_soda = food(0, 0, 0, 0, { tsp: 5 });
  N.broth = food(3, 0, 0.1, 0);
  N.stock = food(3, 0, 0.1, 0);
  N.soy_sauce = food(53, 0.6, 8, 0.8, { tbsp: 16 });
  N.vinegar = food(21, 0, 0, 0, { tbsp: 15 });
  N.mixed_vegetables = food(40, 0.2, 1.5, 2.5);
  N.dosa_batter = food(120, 2, 3, 1, { cup: 240 });
  N.drumstick = food(37, 0.2, 2.5, 2, { piece: 25 });
  N.ham = food(145, 5, 21, 0, { piece: 25 });

  var OVERRIDES = {
    'penne pasta': 'pasta', 'pasta': 'pasta', 'macaroni': 'pasta', 'spaghetti': 'pasta',
    'fusilli': 'pasta', 'noodles': 'noodles', 'rice noodles': 'noodles', 'egg noodles': 'noodles',
    'crushed tomatoes': 'tomato', 'diced tomatoes': 'tomato', 'canned tomatoes': 'tomato',
    'cherry tomatoes': 'tomato', 'chopped tomatoes': 'tomato', 'tomatoes': 'tomato',
    'tomato': 'tomato', 'tomato puree': 'tomato_paste', 'tomato paste': 'tomato_paste',
    'garlic cloves': 'garlic', 'garlic clove': 'garlic', 'garlic': 'garlic', 'garlic powder': 'garlic',
    'fresh basil': 'basil', 'basil': 'basil', 'basil leaves': 'basil',
    'chicken breast': 'chicken', 'chicken breasts': 'chicken', 'chicken': 'chicken',
    'chicken thighs': 'chicken_thigh', 'boneless chicken': 'chicken',
    'parmesan cheese': 'parmesan', 'parmesan': 'parmesan', 'parmigiano': 'parmesan',
    'heavy cream': 'cream', 'heavy whipping cream': 'cream', 'whipping cream': 'cream',
    'cream': 'cream', 'single cream': 'cream',
    'kalamata olives': 'olives', 'black olives': 'olives', 'olives': 'olives',
    'olive oil': 'oil', 'cooking oil': 'oil', 'vegetable oil': 'oil', 'canola oil': 'oil',
    'sunflower oil': 'oil', 'oil': 'oil', 'coconut oil': 'coconut_oil',
    'sea salt': 'salt', 'kosher salt': 'salt', 'salt': 'salt', 'table salt': 'salt',
    'canned chickpeas': 'chickpeas', 'chickpeas': 'chickpeas', 'garbanzo beans': 'chickpeas',
    'vegetable broth': 'broth', 'vegetable stock': 'stock', 'chicken broth': 'broth',
    'chicken stock': 'stock', 'stock': 'stock', 'broth': 'broth',
    'green chilli': 'chilli', 'green chillies': 'chilli', 'green chiles': 'chilli',
    'green chili': 'chilli', 'red chilli': 'chilli', 'chilli': 'chilli', 'chili': 'chilli',
    'chilli flakes': 'chilli_flakes', 'red chilli flakes': 'chilli_flakes',
    'mustard seeds': 'mustard_seed', 'mustard seed': 'mustard_seed',
    'turmeric powder': 'turmeric', 'turmeric': 'turmeric',
    'curry leaves': 'curry_leaves', 'curry leaf': 'curry_leaves', 'kadi patta': 'curry_leaves',
    'parboiled rice': 'rice_raw', 'basmati rice': 'rice_raw', 'jasmine rice': 'rice_raw',
    'white rice': 'rice_raw', 'long grain rice': 'rice_raw', 'raw rice': 'rice_raw', 'rice': 'rice_raw',
    'cooked rice': 'rice_cooked', 'steamed rice': 'rice_cooked', 'leftover rice': 'rice_cooked',
    'urad dal': 'dal', 'toor dal': 'dal', 'masoor dal': 'dal', 'moong dal': 'dal',
    'red lentils': 'dal', 'yellow lentils': 'dal', 'split lentils': 'dal', 'lentils': 'dal', 'dal': 'dal',
    'fenugreek seeds': 'fenugreek', 'methi seeds': 'fenugreek', 'fenugreek': 'fenugreek',
    'dosa batter': 'dosa_batter', 'idli batter': 'dosa_batter',
    'tamarind paste': 'tamarind', 'tamarind': 'tamarind', 'imli': 'tamarind',
    'black pepper': 'pepper', 'black peppercorns': 'pepper', 'peppercorns': 'pepper',
    'ground pepper': 'pepper', 'pepper': 'pepper',
    'sambar powder': 'sambar_powder', 'rasam powder': 'rasam_powder',
    'chettinad masala': 'chettinad_masala', 'chettinad spice mix': 'chettinad_masala',
    'ginger garlic paste': 'ginger_garlic_paste', 'ginger-garlic paste': 'ginger_garlic_paste',
    'mixed vegetables': 'mixed_vegetables', 'mixed veg': 'mixed_vegetables',
    'frozen mixed vegetables': 'mixed_vegetables',
    'cashew nuts': 'cashew', 'cashews': 'cashew', 'cashew': 'cashew',
    'semolina': 'semolina', 'rava': 'semolina', 'sooji': 'semolina', 'cream of wheat': 'semolina',
    'coconut milk': 'coconut_milk', 'fresh coconut': 'coconut', 'grated coconut': 'coconut',
    'shredded coconut': 'coconut', 'desiccated coconut': 'coconut', 'coconut': 'coconut',
    'drumstick': 'drumstick', 'peanuts': 'peanut', 'peanut': 'peanut', 'roasted peanuts': 'peanut',
    'lemon': 'lemon', 'lemons': 'lemon', 'lemon juice': 'lemon_juice', 'lime': 'lime',
    'yogurt': 'yogurt', 'greek yogurt': 'yogurt', 'curd': 'yogurt',
    'milk': 'milk', 'whole milk': 'milk', 'skim milk': 'milk',
    'eggs': 'egg', 'egg': 'egg', 'egg whites': 'egg',
    'onion': 'onion', 'onions': 'onion', 'red onion': 'onion', 'yellow onion': 'onion',
    'white onion': 'onion', 'spring onion': 'onion',
    'carrot': 'carrot', 'carrots': 'carrot', 'celery': 'celery', 'spinach': 'spinach',
    'feta cheese': 'feta', 'feta': 'feta', 'quinoa': 'quinoa',
    'water': 'water', 'tomato puree': 'tomato_paste',
    'mozzarella cheese': 'mozzarella', 'mozzarella': 'mozzarella',
    'cheddar cheese': 'cheese_cheddar', 'cheddar': 'cheese_cheddar', 'cheese': 'cheese',
    'paneer': 'paneer', 'cottage cheese': 'paneer',
    'tofu': 'tofu', 'firm tofu': 'tofu',
    'salmon': 'salmon', 'salmon fillet': 'salmon', 'tuna': 'tuna',
    'shrimp': 'shrimp', 'prawns': 'shrimp', 'prawn': 'shrimp',
    'cod': 'fish_white', 'white fish': 'fish_white', 'tilapia': 'fish_white',
    'bacon': 'bacon', 'sausages': 'sausage', 'sausage': 'sausage',
    'potato': 'potato', 'potatoes': 'potato', 'baby potatoes': 'potato',
    'sweet potato': 'sweet_potato', 'sweet potatoes': 'sweet_potato',
    'mushroom': 'mushroom', 'mushrooms': 'mushroom', 'button mushrooms': 'mushroom',
    'bell pepper': 'bell_pepper', 'capsicum': 'bell_pepper', 'pepper': 'pepper',
    'green pepper': 'bell_pepper', 'eggplant': 'eggplant', 'aubergine': 'eggplant',
    'zucchini': 'zucchini', 'courgette': 'zucchini', 'broccoli': 'broccoli',
    'cauliflower': 'cauliflower', 'cabbage': 'cabbage', 'green beans': 'green_beans',
    'peas': 'peas', 'green peas': 'peas', 'corn': 'corn', 'sweetcorn': 'corn',
    'avocado': 'avocado', 'apple': 'apple', 'apples': 'apple', 'banana': 'banana',
    'bananas': 'banana', 'mango': 'mango', 'strawberries': 'strawberry',
    'strawberry': 'strawberry', 'blueberries': 'blueberry', 'blueberry': 'blueberry',
    'peanut butter': 'peanut_butter', 'almonds': 'almond', 'almond': 'almond',
    'walnuts': 'walnut', 'walnut': 'walnut', 'ketchup': 'ketchup',
    'soy sauce': 'soy_sauce', 'vinegar': 'vinegar', 'white vinegar': 'vinegar',
    'balsamic vinegar': 'vinegar', 'apple cider vinegar': 'vinegar',
    'mayonnaise': 'mayonnaise', 'mayo': 'mayonnaise',
    'honey': 'honey', 'maple syrup': 'maple_syrup', 'dark chocolate': 'chocolate_dark',
    'chocolate': 'chocolate_dark', 'cocoa powder': 'cocoa', 'cocoa': 'cocoa',
    'vanilla extract': 'vanilla', 'vanilla': 'vanilla', 'vanilla essence': 'vanilla',
    'baking powder': 'baking_powder', 'baking soda': 'baking_soda', 'bicarbonate of soda': 'baking_soda',
    'all purpose flour': 'flour', 'whole wheat flour': 'flour', 'all-purpose flour': 'flour',
    'plain flour': 'flour', 'self raising flour': 'flour', 'flour': 'flour',
    'oat': 'oats', 'rolled oats': 'oats', 'oats': 'oats', 'quick oats': 'oats',
    'granulated sugar': 'sugar', 'brown sugar': 'sugar', 'sugar': 'sugar',
    'olive oil': 'oil', 'bread': 'bread', 'sourdough': 'bread', 'baguette': 'bread',
    'roll': 'bread', 'tortilla': 'flour', 'puff pastry': 'puff_pastry',
    'beef': 'beef', 'ground beef': 'beef_mince', 'minced beef': 'beef_mince',
    'pork': 'pork', 'ham': 'ham', 'cornstarch': 'flour', 'corn flour': 'flour',
    'potato starch': 'flour', 'smoked paprika': 'paprika', 'paprika': 'paprika',
    'dried oregano': 'oregano', 'oregano': 'oregano', 'dried thyme': 'thyme', 'thyme': 'thyme',
    'fresh rosemary': 'rosemary', 'rosemary': 'rosemary', 'bay leaf': 'bay_leaf',
    'bay leaves': 'bay_leaf', 'cumin': 'cumin', 'ground cumin': 'cumin', 'cumin seeds': 'cumin',
    'coriander': 'coriander_seed', 'coriander seeds': 'coriander_seed', 'ground coriander': 'coriander_seed',
    'black peppercorns': 'pepper', 'cinnamon': 'cinnamon', 'cinnamon stick': 'cinnamon',
    'cloves': 'cloves', 'cardamom': 'cardamom', 'green cardamom': 'cardamom',
    'garam masala': 'garam_masala', 'ginger': 'ginger', 'fresh ginger': 'ginger',
    'ginger garlic paste': 'ginger_garlic_paste', 'canned corn': 'corn',
    'kidney beans': 'kidney_beans', 'black beans': 'beans', 'refried beans': 'beans',
    'lentils': 'dal', 'sweet corn': 'corn', 'sugar': 'sugar',
    'unsalted butter': 'butter', 'butter': 'butter', 'ghee': 'ghee', 'clarified butter': 'ghee',
    'cream cheese': 'cream_cheese', 'sour cream': 'sour_cream', 'sriracha': 'ketchup',
    'hot sauce': 'ketchup', 'worcestershire sauce': 'soy_sauce', 'fish sauce': 'soy_sauce'
  };

  var MODIFIERS = ['fresh', 'canned', 'cooked', 'dried', 'dry', 'crushed', 'diced', 'chopped',
    'sliced', 'grated', 'shredded', 'frozen', 'whole', 'ground', 'raw', 'peeled', 'smoked',
    'roasted', 'boiled', 'minced', 'plain', 'organic', 'large', 'medium', 'small', 'steamed',
    'leftover', 'chilled', 'melted', 'softened', 'warm', 'cold', 'hot', 'tender'];

  function normName(s) {
    return String(s || '').trim().toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ');
  }

  function lookup(name) {
    var n = normName(name);
    if (!n) return null;
    if (OVERRIDES[n]) return N[OVERRIDES[n]];
    var stripped = n;
    var tokens = stripped.split(' ');
    tokens = tokens.filter(function (t) { return MODIFIERS.indexOf(t) === -1; });
    stripped = tokens.join(' ').replace(/\s+/g, ' ').replace(/s$/, '');
    if (stripped !== n && OVERRIDES[stripped]) return N[OVERRIDES[stripped]];
    if (N[stripped]) return N[stripped];
    if (OVERRIDES[n.replace(/s$/, '')]) return N[OVERRIDES[n.replace(/s$/, '')]];
    var best = null, bestLen = 0;
    for (var key in OVERRIDES) {
      if (!OVERRIDES.hasOwnProperty(key)) continue;
      if (key.length < 3) continue;
      if (n.indexOf(key) !== -1 || key.indexOf(n) !== -1) {
        if (key.length > bestLen) { bestLen = key.length; best = N[OVERRIDES[key]]; }
      }
    }
    return best;
  }

  function gramsOf(ing, db) {
    var u = String(ing.unit || 'g').toLowerCase();
    var q = parseFloat(ing.qty);
    if (isNaN(q) || q <= 0) q = 1;
    switch (u) {
      case 'g': return q;
      case 'kg': return q * 1000;
      case 'ml': return q * (db.density || 1);
      case 'l': return q * 1000 * (db.density || 1);
      case 'pcs': return q * (db.piece || 25);
      case 'tbsp': return q * (db.tbsp || 15);
      case 'tsp': return q * (db.tsp || 5);
      case 'cup': return q * (db.cup || 240);
      case 'bunch': return q * (db.bunch || 30);
      case 'block': return q * (db.block || 200);
      case 'pack': return q * (db.pack || 100);
      case 'filet': return q * (db.filet || 150);
      case 'piece': return q * (db.piece || 100);
      default: return q;
    }
  }

  function servingsOf(recipe) {
    var s = String(recipe.servings || '1 serving');
    var m = s.match(/(\d+\.?\d*)/);
    if (m) return parseFloat(m[1]);
    return 1;
  }

  function compute(recipe) {
    var out = {
      kcal: 0, fat: 0, protein: 0, fiber: 0,
      perServing: { kcal: 0, fat: 0, protein: 0, fiber: 0 },
      matched: 0, total: 0, servings: servingsOf(recipe), covered: false
    };
    if (!recipe || !recipe.ingredients) return out;
    out.total = recipe.ingredients.length;
    recipe.ingredients.forEach(function (ing) {
      var db = lookup(ing.name);
      if (!db) return;
      var g = gramsOf(ing, db);
      var f = g / 100;
      out.kcal += db.kcal * f;
      out.fat += db.fat * f;
      out.protein += db.pro * f;
      out.fiber += db.fib * f;
      out.matched++;
    });
    var sv = Math.max(out.servings, 1);
    out.perServing.kcal = out.kcal / sv;
    out.perServing.fat = out.fat / sv;
    out.perServing.protein = out.protein / sv;
    out.perServing.fiber = out.fiber / sv;
    out.covered = out.matched > 0 && out.total > 0;
    return out;
  }

  function r1(n) { return Math.round(n * 10) / 10; }
  function r0(n) { return Math.round(n); }

  function pretty(n) {
    if (n >= 100) return String(r0(n));
    return String(r1(n));
  }

  window.ksNutrition = {
    lookup: lookup,
    compute: compute,
    per100: N,
    pretty: pretty
  };
})();
