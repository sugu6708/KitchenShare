/* KitchenShare - catalog_cook_shopping | module 15/22 | classic script, loads in filename order */
"use strict";
  var RECIPES = {
    'rustic-basil-pomodoro': {
      name: 'Rustic Basil Pomodoro',
      servings: '2 servings',
      time: '25 min',
      kcal: '450 kcal',
      tag: 'Dinner • Pasta',
      cat: 'italian quick dinner',
      icon: 'ramen_dining',
      gradient: 'from-[#f3e2c8] to-[#e6c193]',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD9oKRLO_11RAfPXxKszQloGh_Bt6BPcm6MePDry367W64VSi3cjYFu-PKUCup1BoSs3Zu175_gX5cG2EXuA7uB_XV40Wt0m8fDTCj6iyfAyHesS95z8ngfOSFgUyqw84B5V5CUMw-z3CCMA0bMIdQGlhXMPDrDRHtoroPSgXEBCfWUU5G4eoWllnZpRbOavXFOgPJMocnuH9pb2sB-xOMVmxzO5YFXR766J6c2ldoqYttCMj7HxnK5Hg',
      ingredients: [
        { name: 'Penne Pasta', qty: 200, unit: 'g' },
        { name: 'Crushed Tomatoes', qty: 400, unit: 'g' },
        { name: 'Fresh Basil', qty: 30, unit: 'g' },
        { name: 'Garlic Cloves', qty: 3, unit: 'pcs' }
      ],
      steps: [
        { title: 'Prep Ingredients', text: 'Mince the garlic and roughly chop the fresh basil. Set aside a few basil leaves for garnish.' },
        { title: 'Boil Pasta', text: 'Bring a large pot of salted water to a boil. Add the penne and cook according to package instructions (about 10-12 minutes) until al dente.' },
        { title: 'Make Sauce', text: 'In a large skillet, heat olive oil over medium heat. Sauté the minced garlic until fragrant. Pour in the crushed tomatoes, season with salt and pepper, and let simmer for 8 minutes.' },
        { title: 'Combine and Serve', text: 'Drain the pasta and add it directly to the skillet with the sauce. Toss well to coat. Stir in the chopped basil. Serve immediately, garnished with remaining basil.' }
      ]
    },
    'creamy-tuscan-chicken': {
      name: 'Creamy Tuscan Garlic Chicken',
      servings: '2 servings',
      time: '30 min',
      kcal: '520 kcal',
      tag: 'Dinner • High Protein',
      cat: 'italian dinner high-protein',
      icon: 'set_meal',
      gradient: 'from-[#f0e2d0] to-[#d9b98c]',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDOb6rbyxUrHxi10hEK8NBGsM1eXwSdAPDZAy-kgGdQt_Iu97IYEFKJ-rpqJlpXaqOWvkfRn5U_VRLs8Nv51gwC-vZfD1OsBvFwwYex_49FnO_nOvdY0s1_Nnb65ZX0UmQZtnsBO3BP6uzxW3E3wIfTz9RAn30epwYFTfZEsDc4E4FPKY0k-qmV9WEbanfQ0cGN5BoTTB4GdXwSPEoykh8IPkdhC2Rp0MAIIMWi3uPmhiKuBvLAy-2VRA',
      ingredients: [
        { name: 'Chicken Breast', qty: 400, unit: 'g' },
        { name: 'Garlic Cloves', qty: 4, unit: 'pcs' },
        { name: 'Cherry Tomatoes', qty: 200, unit: 'g' },
        { name: 'Spinach', qty: 100, unit: 'g' },
        { name: 'Heavy Cream', qty: 200, unit: 'ml' },
        { name: 'Parmesan Cheese', qty: 50, unit: 'g' }
      ],
      steps: [
        { title: 'Sear Chicken', text: 'Season the chicken and sear in a hot skillet with olive oil until golden and cooked through. Remove and set aside.' },
        { title: 'Build Sauce', text: 'In the same pan, sauté garlic and halved cherry tomatoes. Add spinach and cook until wilted.' },
        { title: 'Creamy Finish', text: 'Pour in the cream, add grated parmesan, and simmer until the sauce coats the back of a spoon.' },
        { title: 'Serve', text: 'Return the chicken to the pan, spoon the sauce over it, and serve with pasta or crusty bread.' }
      ]
    },
    'mediterranean-quinoa-bowl': {
      name: 'Mediterranean Quinoa Bowl',
      servings: '2 servings',
      time: '15 min',
      kcal: '380 kcal',
      tag: 'Lunch • Vegetarian',
      cat: 'vegan quick lunch vegetarian',
      icon: 'nutrition',
      gradient: 'from-[#dcefd8] to-[#a8d3a0]',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB-hCmR0cxKmCY4okV-cUo2uUeJjK7mIjn_muh-UMb3XFHxcrH8vIBxBPxwHCPRH22HjYWrmlZ_dCqzVenqIuQnsxCaAepsQpQwV1_iQeZeAp2LAQI87QzzG6ouolMdpb3fCNEGXXYPRXoTUaTA3RhvICvxZM4-SewSFsU8euuaF2qzrz9HhuwFvE8yG7tWTtVYwwcPBwCNEKxqg7RP-TesG6rXBbioMtWy2r6Q2cepu-0MiZaZx_zFnQ',
      ingredients: [
        { name: 'Quinoa', qty: 180, unit: 'g' },
        { name: 'Cherry Tomatoes', qty: 150, unit: 'g' },
        { name: 'Cucumber', qty: 1, unit: 'pcs' },
        { name: 'Feta Cheese', qty: 80, unit: 'g' },
        { name: 'Kalamata Olives', qty: 60, unit: 'g' },
        { name: 'Olive Oil', qty: 2, unit: 'tbsp' }
      ],
      steps: [
        { title: 'Cook Quinoa', text: 'Rinse the quinoa and cook in salted water until fluffy, about 12 minutes. Let it cool slightly.' },
        { title: 'Prep Veggies', text: 'Dice the cucumber and halve the cherry tomatoes. Slice the olives.' },
        { title: 'Assemble', text: 'Toss the quinoa with the vegetables, crumbled feta, olives, and olive oil. Season with salt and pepper.' },
        { title: 'Serve', text: 'Serve in a bowl, drizzled with a little lemon juice if you like.' }
      ]
    },
    'hearty-veggie-minestrone': {
      name: 'Hearty Veggie Minestrone',
      servings: '4 servings',
      time: '45 min',
      kcal: '260 kcal',
      tag: 'Soup • Vegan',
      cat: 'vegan soup',
      icon: 'soup_kitchen',
      gradient: 'from-[#f6e0c4] to-[#d9a86b]',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBzYDzszjigCq0kw0eKGnIZPBgbtjwXncCye-WpWmtl_QvdrlDY86TXRQIcSrjrarzm8MIdqRFWFcNeElyNKplG3TX1UUEUoBA2tpuB9fAPlfpSeTYWoANyu9ea7ks1Fsxc1rCle1JVuLxsXTMUfAf5IiIkVKN933dHfVblzqALCdvhc5U-_V6198vr0jlv2cymnz-gR_4TGdFoQSAOPgC7Xhlc7y7yQCa8F6awJsHdsxalgNUGWZN7wQ',
      ingredients: [
        { name: 'Olive Oil', qty: 2, unit: 'tbsp' },
        { name: 'Onion', qty: 1, unit: 'pcs' },
        { name: 'Carrot', qty: 1, unit: 'pcs' },
        { name: 'Celery', qty: 2, unit: 'pcs' },
        { name: 'Diced Tomatoes', qty: 400, unit: 'g' },
        { name: 'Canned Chickpeas', qty: 400, unit: 'g' },
        { name: 'Penne Pasta', qty: 100, unit: 'g' },
        { name: 'Vegetable Broth', qty: 800, unit: 'ml' }
      ],
      steps: [
        { title: 'Sauté Vegetables', text: 'Heat the olive oil and soften the onion, carrot, and celery for about 8 minutes.' },
        { title: 'Simmer Soup', text: 'Add the diced tomatoes, chickpeas, and vegetable broth. Simmer for 20 minutes.' },
        { title: 'Add Pasta', text: 'Stir in the penne and cook until tender, about 10 minutes.' },
        { title: 'Season and Serve', text: 'Season with salt, pepper, and fresh herbs. Ladle into bowls and serve with crusty bread.' }
      ]
    },
    'masala-dosa': {
      name: 'Masala Dosa',
      servings: '2 servings',
      time: '30 min',
      kcal: '320 kcal',
      tag: 'South Indian • Breakfast',
      cat: 'southindian breakfast vegetarian',
      icon: 'ramen_dining',
      gradient: 'from-[#f3e2c8] to-[#e0b87a]',
      ingredients: [
        { name: 'Dosa Batter', qty: 500, unit: 'g' },
        { name: 'Potatoes', qty: 300, unit: 'g' },
        { name: 'Onion', qty: 1, unit: 'pcs' },
        { name: 'Green Chilli', qty: 2, unit: 'pcs' },
        { name: 'Mustard Seeds', qty: 1, unit: 'tsp' },
        { name: 'Turmeric Powder', qty: 1, unit: 'tsp' },
        { name: 'Curry Leaves', qty: 1, unit: 'bunch' },
        { name: 'Sea Salt', qty: 5, unit: 'g' },
        { name: 'Cooking Oil', qty: 3, unit: 'tbsp' }
      ],
      steps: [
        { title: 'Make Filling', text: 'Boil and mash the potatoes. Temper mustard seeds, onion, green chillies, and curry leaves in oil, then add turmeric, salt, and the mashed potato. Cook for 3 minutes.' },
        { title: 'Heat the Tawa', text: 'Heat a flat griddle over medium-high heat and lightly oil it.' },
        { title: 'Spread the Dosa', text: 'Pour a ladle of dosa batter in the center and spread it in a thin circle with the back of the ladle.' },
        { title: 'Crisp and Fold', text: 'Drizzle a little oil around the edges, cook until golden, place the potato filling in the center, and fold. Serve hot with coconut chutney and sambar.' }
      ]
    },
    'idli': {
      name: 'Idli',
      servings: '2 servings',
      time: '35 min',
      kcal: '180 kcal',
      tag: 'South Indian • Breakfast',
      cat: 'southindian breakfast vegetarian',
      icon: 'egg_alt',
      gradient: 'from-[#f0f0ea] to-[#d7d7c8]',
      ingredients: [
        { name: 'Parboiled Rice', qty: 250, unit: 'g' },
        { name: 'Urad Dal', qty: 100, unit: 'g' },
        { name: 'Fenugreek Seeds', qty: 1, unit: 'tsp' },
        { name: 'Sea Salt', qty: 5, unit: 'g' },
        { name: 'Water', qty: 200, unit: 'ml' }
      ],
      steps: [
        { title: 'Soak', text: 'Soak the rice and urad dal (with fenugreek) separately for 4 hours.' },
        { title: 'Grind Batter', text: 'Grind the dal and rice to a smooth batter, adding water as needed. It should be thick and airy.' },
        { title: 'Ferment', text: 'Cover and leave the batter in a warm place overnight to ferment and rise.' },
        { title: 'Steam', text: 'Season with salt, pour into greased idli molds, and steam for 10-12 minutes. Serve with sambar and chutney.' }
      ]
    },
    'sambar': {
      name: 'Sambar',
      servings: '4 servings',
      time: '45 min',
      kcal: '210 kcal',
      tag: 'South Indian • Curry',
      cat: 'southindian dinner vegetarian vegan',
      icon: 'soup_kitchen',
      gradient: 'from-[#f2d9b8] to-[#cf7f3f]',
      ingredients: [
        { name: 'Toor Dal', qty: 200, unit: 'g' },
        { name: 'Drumstick', qty: 2, unit: 'pcs' },
        { name: 'Carrot', qty: 1, unit: 'pcs' },
        { name: 'Tomato', qty: 2, unit: 'pcs' },
        { name: 'Onion', qty: 1, unit: 'pcs' },
        { name: 'Sambar Powder', qty: 3, unit: 'tbsp' },
        { name: 'Tamarind Paste', qty: 1, unit: 'tbsp' },
        { name: 'Mustard Seeds', qty: 1, unit: 'tsp' },
        { name: 'Turmeric Powder', qty: 1, unit: 'tsp' },
        { name: 'Curry Leaves', qty: 1, unit: 'bunch' },
        { name: 'Cooking Oil', qty: 2, unit: 'tbsp' },
        { name: 'Sea Salt', qty: 5, unit: 'g' }
      ],
      steps: [
        { title: 'Cook Dal', text: 'Pressure-cook the toor dal until soft and mash it with turmeric.' },
        { title: 'Simmer Vegetables', text: 'Add the chopped vegetables, tomatoes, sambar powder, and tamarind paste to the dal. Simmer until the vegetables are tender.' },
        { title: 'Temper', text: 'In a small pan, splutter mustard seeds and curry leaves in oil, then pour over the sambar.' },
        { title: 'Serve', text: 'Season with salt and serve hot with idli, dosa, or steamed rice.' }
      ]
    },
    'rasam': {
      name: 'Rasam',
      servings: '3 servings',
      time: '25 min',
      kcal: '120 kcal',
      tag: 'South Indian • Soup',
      cat: 'southindian dinner soup vegetarian vegan',
      icon: 'local_cafe',
      gradient: 'from-[#f2c9a8] to-[#c96a2e]',
      ingredients: [
        { name: 'Tomato', qty: 3, unit: 'pcs' },
        { name: 'Tamarind Paste', qty: 1, unit: 'tbsp' },
        { name: 'Rasam Powder', qty: 2, unit: 'tbsp' },
        { name: 'Garlic Cloves', qty: 4, unit: 'pcs' },
        { name: 'Cumin', qty: 1, unit: 'tsp' },
        { name: 'Black Pepper', qty: 1, unit: 'tsp' },
        { name: 'Mustard Seeds', qty: 1, unit: 'tsp' },
        { name: 'Curry Leaves', qty: 1, unit: 'bunch' },
        { name: 'Cooking Oil', qty: 1, unit: 'tbsp' },
        { name: 'Sea Salt', qty: 3, unit: 'g' }
      ],
      steps: [
        { title: 'Simmer Base', text: 'Boil the tomatoes with tamarind paste, rasam powder, and a cup of water until the tomatoes soften.' },
        { title: 'Season', text: 'Crush garlic, cumin, and pepper, and add to the simmering rasam with salt. Cook for 5 minutes.' },
        { title: 'Temper', text: 'Splutter mustard seeds and curry leaves in oil and pour over the rasam.' },
        { title: 'Serve', text: 'Serve hot as a soup or poured over steamed rice.' }
      ]
    },
    'lemon-rice': {
      name: 'Lemon Rice',
      servings: '2 servings',
      time: '20 min',
      kcal: '280 kcal',
      tag: 'South Indian • Lunch',
      cat: 'southindian lunch quick vegetarian vegan',
      icon: 'lemon',
      gradient: 'from-[#f6eec0] to-[#e0c84f]',
      ingredients: [
        { name: 'Cooked Rice', qty: 400, unit: 'g' },
        { name: 'Lemon', qty: 2, unit: 'pcs' },
        { name: 'Peanuts', qty: 50, unit: 'g' },
        { name: 'Mustard Seeds', qty: 1, unit: 'tsp' },
        { name: 'Green Chilli', qty: 2, unit: 'pcs' },
        { name: 'Turmeric Powder', qty: 1, unit: 'tsp' },
        { name: 'Curry Leaves', qty: 1, unit: 'bunch' },
        { name: 'Cooking Oil', qty: 2, unit: 'tbsp' },
        { name: 'Sea Salt', qty: 4, unit: 'g' }
      ],
      steps: [
        { title: 'Temper', text: 'Heat oil and splutter mustard seeds, green chillies, curry leaves, and peanuts until golden.' },
        { title: 'Season Rice', text: 'Add turmeric and salt, then fold in the cooked rice over low heat.' },
        { title: 'Finish with Lemon', text: 'Turn off the heat, squeeze the lemon juice over the rice, and mix well.' },
        { title: 'Serve', text: 'Serve warm with papad or as a lunchbox meal.' }
      ]
    },
    'curd-rice': {
      name: 'Curd Rice',
      servings: '2 servings',
      time: '15 min',
      kcal: '260 kcal',
      tag: 'South Indian • Lunch',
      cat: 'southindian lunch quick vegetarian',
      icon: 'icecream',
      gradient: 'from-[#eef2f0] to-[#c8d6d1]',
      ingredients: [
        { name: 'Cooked Rice', qty: 300, unit: 'g' },
        { name: 'Yogurt', qty: 250, unit: 'g' },
        { name: 'Milk', qty: 50, unit: 'ml' },
        { name: 'Ginger', qty: 1, unit: 'tsp' },
        { name: 'Green Chilli', qty: 1, unit: 'pcs' },
        { name: 'Mustard Seeds', qty: 1, unit: 'tsp' },
        { name: 'Curry Leaves', qty: 1, unit: 'bunch' },
        { name: 'Cooking Oil', qty: 1, unit: 'tbsp' },
        { name: 'Sea Salt', qty: 3, unit: 'g' }
      ],
      steps: [
        { title: 'Mix Rice', text: 'Mash the warm rice lightly and mix in the yogurt, milk, and salt.' },
        { title: 'Temper', text: 'Splutter mustard seeds with ginger, green chilli, and curry leaves in oil.' },
        { title: 'Combine', text: 'Pour the tempering over the yogurt rice and stir gently.' },
        { title: 'Serve', text: 'Serve chilled or at room temperature, with mango pickle on the side.' }
      ]
    },
    'rava-upma': {
      name: 'Rava Upma',
      servings: '2 servings',
      time: '20 min',
      kcal: '240 kcal',
      tag: 'South Indian • Breakfast',
      cat: 'southindian breakfast quick vegetarian vegan',
      icon: 'rice_bowl',
      gradient: 'from-[#f3e7cd] to-[#d9b877]',
      ingredients: [
        { name: 'Semolina', qty: 150, unit: 'g' },
        { name: 'Onion', qty: 1, unit: 'pcs' },
        { name: 'Green Chilli', qty: 2, unit: 'pcs' },
        { name: 'Ginger', qty: 1, unit: 'tsp' },
        { name: 'Mustard Seeds', qty: 1, unit: 'tsp' },
        { name: 'Cashew Nuts', qty: 2, unit: 'tbsp' },
        { name: 'Curry Leaves', qty: 1, unit: 'bunch' },
        { name: 'Cooking Oil', qty: 2, unit: 'tbsp' },
        { name: 'Water', qty: 400, unit: 'ml' },
        { name: 'Sea Salt', qty: 4, unit: 'g' }
      ],
      steps: [
        { title: 'Roast Semolina', text: 'Dry-roast the semolina in a pan over low heat until fragrant. Set aside.' },
        { title: 'Temper', text: 'Splutter mustard seeds, cashews, onion, chillies, ginger, and curry leaves in oil.' },
        { title: 'Cook Upma', text: 'Add water and salt, bring to a boil, then slowly stir in the semolina, cooking until it absorbs the water.' },
        { title: 'Rest and Serve', text: 'Cover for 2 minutes, fluff gently, and serve hot with coconut chutney.' }
      ]
    },
    'medu-vada': {
      name: 'Medu Vada',
      servings: '4 servings',
      time: '40 min',
      kcal: '310 kcal',
      tag: 'South Indian • Snack',
      cat: 'southindian breakfast snack vegetarian',
      icon: 'bakery_dining',
      gradient: 'from-[#efdfc0] to-[#c99c58]',
      ingredients: [
        { name: 'Urad Dal', qty: 200, unit: 'g' },
        { name: 'Onion', qty: 1, unit: 'pcs' },
        { name: 'Green Chilli', qty: 2, unit: 'pcs' },
        { name: 'Ginger', qty: 1, unit: 'tsp' },
        { name: 'Black Pepper', qty: 1, unit: 'tsp' },
        { name: 'Curry Leaves', qty: 1, unit: 'bunch' },
        { name: 'Cooking Oil', qty: 500, unit: 'ml' },
        { name: 'Sea Salt', qty: 4, unit: 'g' }
      ],
      steps: [
        { title: 'Soak and Grind', text: 'Soak the urad dal for 3 hours, then grind to a fluffy, thick batter, whipping in a little water and air.' },
        { title: 'Season Batter', text: 'Fold in chopped onion, green chillies, ginger, pepper, curry leaves, and salt.' },
        { title: 'Shape and Fry', text: 'Wet your hands, shape rounds with a hole in the center, and deep-fry in hot oil until golden and crisp.' },
        { title: 'Serve', text: 'Drain on paper towels and serve hot with coconut chutney and sambar.' }
      ]
    },
    'avial': {
      name: 'Avial',
      servings: '4 servings',
      time: '30 min',
      kcal: '190 kcal',
      tag: 'South Indian • Curry',
      cat: 'southindian dinner vegetarian vegan',
      icon: 'eco',
      gradient: 'from-[#dfeee0] to-[#a4cfa8]',
      ingredients: [
        { name: 'Mixed Vegetables', qty: 500, unit: 'g' },
        { name: 'Coconut', qty: 1, unit: 'cup' },
        { name: 'Yogurt', qty: 100, unit: 'g' },
        { name: 'Green Chilli', qty: 2, unit: 'pcs' },
        { name: 'Cumin', qty: 1, unit: 'tsp' },
        { name: 'Curry Leaves', qty: 1, unit: 'bunch' },
        { name: 'Coconut Oil', qty: 1, unit: 'tbsp' },
        { name: 'Sea Salt', qty: 4, unit: 'g' }
      ],
      steps: [
        { title: 'Cook Vegetables', text: 'Boil the mixed vegetables in salted water until just tender, keeping them intact.' },
        { title: 'Make Coconut Paste', text: 'Grind grated coconut with green chillies and cumin to a coarse paste.' },
        { title: 'Combine', text: 'Stir the paste and yogurt into the vegetables over low heat without boiling.' },
        { title: 'Finish', text: 'Drizzle with coconut oil and curry leaves, then serve with rice.' }
      ]
    },
    'chettinad-chicken': {
      name: 'Chettinad Chicken Curry',
      servings: '3 servings',
      time: '50 min',
      kcal: '420 kcal',
      tag: 'South Indian • Curry',
      cat: 'southindian dinner',
      icon: 'set_meal',
      gradient: 'from-[#f2cfc0] to-[#b85c3a]',
      ingredients: [
        { name: 'Chicken', qty: 500, unit: 'g' },
        { name: 'Onion', qty: 2, unit: 'pcs' },
        { name: 'Tomato', qty: 2, unit: 'pcs' },
        { name: 'Ginger Garlic Paste', qty: 2, unit: 'tbsp' },
        { name: 'Chettinad Masala', qty: 3, unit: 'tbsp' },
        { name: 'Cinnamon', qty: 1, unit: 'tsp' },
        { name: 'Cloves', qty: 1, unit: 'tsp' },
        { name: 'Coconut Milk', qty: 200, unit: 'ml' },
        { name: 'Curry Leaves', qty: 1, unit: 'bunch' },
        { name: 'Cooking Oil', qty: 3, unit: 'tbsp' },
        { name: 'Sea Salt', qty: 5, unit: 'g' }
      ],
      steps: [
        { title: 'Brown Spices', text: 'Heat oil and toast cinnamon, cloves, and curry leaves. Add onions and sauté until golden.' },
        { title: 'Cook Masala', text: 'Add ginger-garlic paste, tomatoes, and chettinad masala. Cook until the oil separates.' },
        { title: 'Add Chicken', text: 'Add the chicken and cook on high for 5 minutes, stirring to coat in the masala.' },
        { title: 'Simmer', text: 'Pour in the coconut milk, season with salt, and simmer until the chicken is cooked through. Serve with steamed rice or parotta.' }
      ]
    }
  };
  function getRecipe(id) {
    if (!id) id = 'rustic-basil-pomodoro';
    loadUserData();
    ensureMyRecipes();
    for (var i = 0; i < myRecipes.length; i++) {
      if (myRecipes[i].id === id) return myRecipes[i];
    }
    var found = findRecipeOwner(id);
    if (found) return found.recipe;
    if (hiddenRecipes.indexOf(id) !== -1) return null;
    if (catalogEdits[id]) return catalogEdits[id];
    if (RECIPES[id]) return RECIPES[id];
    return RECIPES['rustic-basil-pomodoro'] || null;
  }

  function cook(recipeId) {
    var recipe = getRecipe(recipeId);
    var used = [], missing = [], negative = [];
    if (!recipe) return { used: used, missing: missing, negative: negative };
    var items = getInventory();
    recipe.ingredients.forEach(function (ing) {
      var target = matchIngredient(ing.name, ing.unit);
      if (!target) { missing.push(ing); return; }
      var base = toBase(target.qty, target.unit) - toBase(ing.qty, ing.unit);
      target.qty = roundNum(Math.max(0, fromBase(base, target.unit)));
      used.push({ name: target.name, unit: target.unit });
      if (target.qty <= 0) negative.push({ name: target.name, qty: target.qty, unit: target.unit });
    });
    saveInventory();
    if (missing.length > 0) {
      var want = missing.map(function (x) { return { name: x.name, qty: x.qty, unit: x.unit, group: recipe.name }; });
      addToShopping(want);
    }
    recordCook(recipeId);
    evaluateAchievements();
    return { used: used, missing: missing, negative: negative };
  }

  var SHOP_SEED = [
    { name: 'Fresh Basil', qty: 2, unit: 'bunch', group: 'Pesto Pasta', done: false },
    { name: 'Cherry Tomatoes', qty: 500, unit: 'g', group: 'Pesto Pasta, Salad', done: false },
    { name: 'Parmesan Cheese', qty: 1, unit: 'block', group: 'Pesto Pasta', done: true }
  ];

  var shopping = null;
  function shopId() { return 'shop-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6); }
  function getShopping() {
    if (shopping) return shopping;
    var uid = currentUserId();
    var data = getUserData(uid, 'shopping', null);
    if (!data) {
      data = JSON.parse(JSON.stringify(SHOP_SEED));
      setUserData(uid, 'shopping', data);
    }
    shopping = data.map(function (it) {
      var q = parseFloat(it.qty);
      var p = parseFloat(it.price);
      return {
        id: it.id || shopId(),
        name: String(it.name || '').trim(),
        qty: isNaN(q) ? 1 : q,
        unit: it.unit || 'pcs',
        group: it.group || '',
        cat: it.cat || '',
        done: !!it.done,
        price: isNaN(p) ? null : p,
        _ua: it._ua || 0
      };
    });
    return shopping;
  }
  function saveShopping() { setUserData(currentUserId(), 'shopping', shopping); dsCoalesce('shop', function () { DS.shopping.saveAll(shopping || []); }); }
  function addToShopping(items) {
    var s = getShopping();
    var added = [];
    items.forEach(function (it) {
      var name = it && it.name ? String(it.name).trim() : '';
      if (!name) return;
      var q = parseFloat(it.qty);
      var found = null;
      for (var i = 0; i < s.length; i++) {
        if (norm(s[i].name) === norm(name)) { found = s[i]; break; }
      }
      if (found) {
        if (!isNaN(q)) { found.qty = q; found.unit = it.unit || found.unit; }
        return;
      }
      var entry = { id: shopId(), name: name, qty: isNaN(q) ? 1 : q, unit: it.unit || 'pcs', group: it.group || 'Planned meals', done: false };
      if (it.cat) entry.cat = it.cat;
      if (typeof it.price === 'number') entry.price = it.price;
      s.push(entry);
      added.push(name);
    });
    saveShopping();
    return added;
  }

  window.ksInventory = {
    list: getInventory,
    save: saveInventory,
    isLow: isLow,
    formatQty: formatQty,
    iconFor: iconFor,
    units: UNITS.slice(),
    add: function (data) {
      data.id = uid();
      dsStamp(data);
      getInventory().push(data);
      saveInventory();
      return data;
    },
    update: function (id, data) {
      var items = getInventory();
      for (var i = 0; i < items.length; i++) {
        if (items[i].id === id) { items[i] = data; dsStamp(items[i]); break; }
      }
      saveInventory();
    },
    remove: function (id) {
      var items = getInventory();
      var out = items.filter(function (it) { return it.id !== id; });
      if (out.length !== items.length) { dsQueueDelete('kitchen', id); inventory = out; saveInventory(); return true; }
      return false;
    }
  };
  window.ksCook = cook;
  window.ksRecipes = RECIPES;
  window.ksShopping = {
    list: getShopping,
    save: saveShopping,
    add: addToShopping,
    get: function (name) {
      var s = getShopping();
      for (var i = 0; i < s.length; i++) if (norm(s[i].name) === norm(name)) return s[i];
      return null;
    },
    update: function (name, data) {
      var s = getShopping();
      for (var i = 0; i < s.length; i++) {
        if (norm(s[i].name) === norm(name)) { s[i] = data; dsStamp(s[i]); break; }
      }
      saveShopping();
    },
    remove: function (name) {
      var s = getShopping();
      var removedId = null;
      var out = s.filter(function (it) {
        if (norm(it.name) === norm(name)) { removedId = it.id; return false; }
        return true;
      });
      if (out.length !== s.length) {
        if (removedId) dsQueueDelete('shopping', removedId);
        shopping = out; saveShopping(); return true;
      }
      return false;
    },
    toggle: function (name, done) {
      var s = getShopping();
      for (var i = 0; i < s.length; i++) {
        if (norm(s[i].name) === norm(name)) { s[i].done = !!done; dsStamp(s[i]); break; }
      }
      saveShopping();
    },
    reset: function () {
      shopping = null;
      setUserData(currentUserId(), 'shopping', JSON.parse(JSON.stringify(SHOP_SEED)));
    }
  };

