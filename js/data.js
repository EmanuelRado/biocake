/**
 * BioCake — Product Data
 * Etapa 3: date citite din Supabase (async) cu fallback local.
 *
 * fetchProducts(category) — async, citește din cloud
 * getProducts(category)   — sync, din cache (populat după fetch)
 * getProductById(id)      — sync, caută în cache
 */

/* ── Mapare row Supabase → obiect JS ───────────────── */
function _mapRow(row) {
    return {
        id:          row.slug,          // slug ca ID (compatibil coș)
        dbId:        row.id,            // UUID Supabase
        slug:        row.slug,
        name:        row.name,
        category:    row.category,
        price:       Number(row.price),
        unit:        row.unit,
        minQty:      Number(row.min_qty  ?? 1),
        step:        Number(row.step     ?? 0.6),
        maxQty:      Number(row.max_qty  ?? 2.4),
        description: row.description,
        badge:       row.badge ?? null,
        weightNote:  row.weight_note ?? false,
        ingredients: row.ingredients ?? '',
        allergens:   row.allergens   ?? [],
        images:      row.images      ?? [],
        nutritional: row.nutritional ?? null,
        emoji:       row.emoji ?? '🍰',
        bg:          row.bg    ?? '#FEE8F1',
        officeBox:   row.category === 'office-box',
        pieces:      row.category === 'office-box' ? Number((row.name.match(/\d+/) || [1])[0]) : undefined,
    };
}

const WEIGHT_OPTIONS = [
    { kg: 1.2, label: '1,2 kg', note: '~8 porții' },
    { kg: 1.8, label: '1,8 kg', note: '~12 porții' },
    { kg: 2.4, label: '2,4 kg', note: '~16 porții' },
];

/* ── Date locale (fallback când Supabase e unavailable) ── */
const _LOCAL_PRODUCTS_RAW = [
    /* ── Torturi Clasice ─────────────────────────────── */
    {
        id: 'tort-fraisier',
        name: 'Tort Fraisier',
        category: 'torturi-clasice',
        price: 180,
        unit: 'kg',
        minQty: 1.2,
        description: 'Mousse delicat de vanilie cu căpșuni proaspete și pandișpan pufos — un clasic franțuzesc reinterpretat cu ingrediente naturale.',
        emoji: '🍰',
        bg: '#FEE8F1',
        badge: null,
        weightNote: true,
        images: ['images/products/tort-felie.png', 'images/products/cupcakes.png', 'images/products/cookies.png'],
        ingredients: 'Ouă* proaspete, zahăr, făină de grâu*, unt* (smântână*), lapte* integral, căpșuni proaspete, cremă de vanilie (lapte*, amidon, zahăr, păstăi de vanilie Bourbon), gelatină, zahăr pudră.',
        allergens: ['Ouă', 'Gluten (grâu)', 'Lapte'],
        nutritional: {
            per: '100g',
            energy_kcal: 310,
            energy_kj: 1297,
            fat: 14,
            saturated_fat: 8.5,
            carbs: 40,
            sugars: 28,
            fiber: 0.8,
            protein: 5.2,
            salt: 0.1,
        },
    },
    {
        id: 'tort-ciocolata-belgiana',
        name: 'Tort Ciocolată Belgiană',
        category: 'torturi-clasice',
        price: 160,
        unit: 'kg',
        minQty: 1.2,
        description: 'Straturi de blat umed de ciocolată belgiană 70% cu ganache cremos și fructe de pădure proaspete.',
        emoji: '🎂',
        bg: '#F5EDE8',
        badge: null,
        weightNote: true,
        images: ['images/products/cupcakes.png', 'images/products/tort-felie.png', 'images/products/cookies.png'],
        ingredients: 'Ouă* proaspete, zahăr brun, făină de grâu*, ciocolată belgiană 70% (cacao*, zahăr, unt de cacao), unt* (smântână*), cacao 22%, smântână pentru frișcă*, frișcă*, zmeură, afine, amidon de porumb.',
        allergens: ['Ouă', 'Gluten (grâu)', 'Lapte', 'Soia (urmă)'],
        nutritional: {
            per: '100g',
            energy_kcal: 390,
            energy_kj: 1632,
            fat: 22,
            saturated_fat: 13,
            carbs: 42,
            sugars: 30,
            fiber: 2.1,
            protein: 5.8,
            salt: 0.15,
        },
    },
    {
        id: 'tort-caramel-nuca',
        name: 'Tort Caramel & Nucă',
        category: 'torturi-clasice',
        price: 170,
        unit: 'kg',
        minQty: 1.2,
        description: 'Caramel sărat cu cremă de nuci prăjite și blat umed de cacao — combinație perfectă între dulce și ușor sărat.',
        emoji: '🍫',
        bg: '#FBF3DE',
        badge: 'Preferat',
        weightNote: true,
        images: ['images/products/cookies.png', 'images/products/tort-felie.png', 'images/products/cupcakes.png'],
        ingredients: 'Nuci*, ouă* proaspete, zahăr, unt* (smântână*), smântână* pentru frișcă, cacao 22%, făină de grâu*, sare de mare, vanilie Bourbon naturală.',
        allergens: ['Nuci (nuci)', 'Ouă', 'Gluten (grâu)', 'Lapte'],
        nutritional: {
            per: '100g',
            energy_kcal: 420,
            energy_kj: 1757,
            fat: 26,
            saturated_fat: 13,
            carbs: 41,
            sugars: 33,
            fiber: 1.5,
            protein: 6.1,
            salt: 0.25,
        },
    },
    {
        id: 'tort-red-velvet',
        name: 'Tort Red Velvet',
        category: 'torturi-clasice',
        price: 175,
        unit: 'kg',
        minQty: 1.2,
        description: 'Blat roșu catifeat cu cremă de mascarpone și vanilie bourbon — un tort iconic cu aspect spectaculos.',
        emoji: '❤️',
        bg: '#FDECEA',
        badge: 'Nou',
        weightNote: true,
        images: ['images/products/tort-felie.png', 'images/products/cookies.png', 'images/products/cupcakes.png'],
        ingredients: 'Ouă* proaspete, zahăr, unt* (smântână*), lapte* integral, făină de grâu*, cacao 22%, oțet de mere, bicarbonat de sodiu, mascarpone* (lapte*), zahăr pudră, extract natural de vanilie Bourbon, colorant natural din sfeclă.',
        allergens: ['Ouă', 'Gluten (grâu)', 'Lapte'],
        nutritional: {
            per: '100g',
            energy_kcal: 360,
            energy_kj: 1506,
            fat: 18,
            saturated_fat: 11,
            carbs: 44,
            sugars: 31,
            fiber: 0.6,
            protein: 5.5,
            salt: 0.18,
        },
    },

    /* ── Prăjituri ───────────────────────────────────── */
    {
        id: 'tarta-fructe',
        name: 'Tartă cu Fructe',
        category: 'prajituri',
        price: 18,
        unit: 'buc',
        minQty: 4,
        step: 1,
        description: 'Coajă crocantă de patiserie cu cremă de vanilie și fructe proaspete de sezon — simplă, elegantă și delicioasă.',
        emoji: '🥧',
        bg: '#E8F7E8',
        badge: null,
        weightNote: false,
        images: ['images/products/cupcakes.png', 'images/products/cookies.png'],
        ingredients: 'Făină de grâu*, unt* (smântână*), zahăr pudră, ouă* proaspete, lapte* integral, amidon, zahăr vanilat, fructe de sezon (căpșuni, kiwi, struguri, mure), gelatină alimentară.',
        allergens: ['Gluten (grâu)', 'Ouă', 'Lapte'],
        nutritional: {
            per: '100g',
            energy_kcal: 280,
            energy_kj: 1172,
            fat: 13,
            saturated_fat: 7.5,
            carbs: 36,
            sugars: 20,
            fiber: 1.2,
            protein: 4.8,
            salt: 0.08,
        },
    },
    {
        id: 'brownie-ciocolata',
        name: 'Brownie Ciocolată',
        category: 'prajituri',
        price: 14,
        unit: 'buc',
        minQty: 4,
        step: 1,
        description: 'Brownie dens și umed cu ciocolată belgiană 70% și nuci pecane — rețeta clasică americană, fără compromisuri.',
        emoji: '🟫',
        bg: '#F5EDE8',
        badge: null,
        weightNote: false,
        images: ['images/products/cookies.png', 'images/products/tort-felie.png'],
        ingredients: 'Ciocolată belgiană 70% (cacao*, zahăr, unt de cacao), unt* (smântână*), ouă* proaspete, zahăr brun, făină de grâu*, nuci pecane*, extract de vanilie Bourbon.',
        allergens: ['Gluten (grâu)', 'Ouă', 'Lapte', 'Nuci (nuci pecane)', 'Soia (urmă)'],
        nutritional: {
            per: '100g',
            energy_kcal: 445,
            energy_kj: 1862,
            fat: 28,
            saturated_fat: 14,
            carbs: 44,
            sugars: 35,
            fiber: 3.2,
            protein: 6.5,
            salt: 0.12,
        },
    },
    {
        id: 'ecler-vanilie',
        name: 'Mini Ecler Vanilie',
        category: 'prajituri',
        price: 12,
        unit: 'buc',
        minQty: 6,
        step: 1,
        description: 'Choux crocus cu cremă diplomat de vanilie și glazură fondant — micul dejun al regilor, la orice oră.',
        emoji: '🥐',
        bg: '#FBF3DE',
        badge: null,
        weightNote: false,
        images: ['images/products/cupcakes.png', 'images/products/tort-felie.png', 'images/products/cookies.png'],
        ingredients: 'Apă, unt* (smântână*), făină de grâu*, ouă* proaspete, lapte* integral, zahăr, amidon de porumb, păstăi de vanilie Bourbon, zahăr pudră, glucoză.',
        allergens: ['Gluten (grâu)', 'Ouă', 'Lapte'],
        nutritional: {
            per: '100g',
            energy_kcal: 295,
            energy_kj: 1234,
            fat: 14,
            saturated_fat: 8,
            carbs: 37,
            sugars: 22,
            fiber: 0.5,
            protein: 5.8,
            salt: 0.2,
        },
    },
    {
        id: 'cheesecake-fructe-padure',
        name: 'Cheesecake Fructe Pădure',
        category: 'prajituri',
        price: 20,
        unit: 'buc',
        minQty: 4,
        step: 1,
        description: 'Cremă bogată de cream cheese pe biscuit crocant, cu coulis de zmeură și mure — clasicul american în varianta premium.',
        emoji: '🫐',
        bg: '#F0E8F5',
        badge: 'Preferat',
        weightNote: false,
        images: ['images/products/tort-felie.png', 'images/products/cupcakes.png'],
        ingredients: 'Cream cheese* (lapte*), smântână* pentru frișcă, zahăr, ouă* proaspete, biscuiți digestivi* (făină integrală de grâu*, zahăr, unt*), unt* (smântână*), zmeură, mure, zahăr, gelatină.',
        allergens: ['Gluten (grâu)', 'Ouă', 'Lapte'],
        nutritional: {
            per: '100g',
            energy_kcal: 330,
            energy_kj: 1381,
            fat: 21,
            saturated_fat: 12.5,
            carbs: 30,
            sugars: 22,
            fiber: 1.0,
            protein: 6.2,
            salt: 0.3,
        },
    },

    /* ── Office Boxes ────────────────────────────────── */
    {
        id: 'office-box-6',
        name: 'Office Box · 6 buc',
        category: 'office-box',
        price: 90,
        unit: 'cutie',
        minQty: 1,
        step: 1,
        description: 'Cutie cu 6 mini-prăjituri artizanale asortate — perfectă pentru o echipă mică sau ca micro-cadou de birou.',
        emoji: '🎁',
        bg: '#FEE8F1',
        badge: null,
        weightNote: false,
        officeBox: true,
        pieces: 6,
        images: ['images/products/cupcakes.png', 'images/products/cookies.png', 'images/products/tort-felie.png'],
        ingredients: 'Mix de mini-prăjituri (compoziție variabilă în funcție de selecție): ouă*, făină de grâu*, zahăr, unt* (lapte*), ciocolată, fructe proaspete, cremă de vanilie (lapte*). Compoziția exactă depinde de selecția zilei.',
        allergens: ['Gluten (grâu)', 'Ouă', 'Lapte', 'Nuci (posibil)'],
        nutritional: {
            per: '100g',
            energy_kcal: 340,
            energy_kj: 1423,
            fat: 18,
            saturated_fat: 10,
            carbs: 40,
            sugars: 28,
            fiber: 1.0,
            protein: 5.5,
            salt: 0.15,
        },
    },
    {
        id: 'office-box-12',
        name: 'Office Box · 12 buc',
        category: 'office-box',
        price: 165,
        unit: 'cutie',
        minQty: 1,
        step: 1,
        description: 'Cutie cu 12 mini-prăjituri artizanale — ideală pentru un departament întreg la zi de naștere.',
        emoji: '🎀',
        bg: '#FEE8F1',
        badge: 'Cel mai ales',
        weightNote: false,
        officeBox: true,
        pieces: 12,
        images: ['images/products/tort-felie.png', 'images/products/cupcakes.png', 'images/products/cookies.png'],
        ingredients: 'Mix de mini-prăjituri (compoziție variabilă în funcție de selecție): ouă*, făină de grâu*, zahăr, unt* (lapte*), ciocolată, fructe proaspete, cremă de vanilie (lapte*). Compoziția exactă depinde de selecția zilei.',
        allergens: ['Gluten (grâu)', 'Ouă', 'Lapte', 'Nuci (posibil)'],
        nutritional: {
            per: '100g',
            energy_kcal: 340,
            energy_kj: 1423,
            fat: 18,
            saturated_fat: 10,
            carbs: 40,
            sugars: 28,
            fiber: 1.0,
            protein: 5.5,
            salt: 0.15,
        },
    },
    {
        id: 'office-box-18',
        name: 'Office Box · 18 buc',
        category: 'office-box',
        price: 240,
        unit: 'cutie',
        minQty: 1,
        step: 1,
        description: 'Cutie cu 18 mini-prăjituri — pentru un open-space întreg. Una pentru fiecare coleg.',
        emoji: '🎊',
        bg: '#FEE8F1',
        badge: null,
        weightNote: false,
        officeBox: true,
        pieces: 18,
        images: ['images/products/cookies.png', 'images/products/cupcakes.png', 'images/products/tort-felie.png'],
        ingredients: 'Mix de mini-prăjituri (compoziție variabilă în funcție de selecție): ouă*, făină de grâu*, zahăr, unt* (lapte*), ciocolată, fructe proaspete, cremă de vanilie (lapte*). Compoziția exactă depinde de selecția zilei.',
        allergens: ['Gluten (grâu)', 'Ouă', 'Lapte', 'Nuci (posibil)'],
        nutritional: {
            per: '100g',
            energy_kcal: 340,
            energy_kj: 1423,
            fat: 18,
            saturated_fat: 10,
            carbs: 40,
            sugars: 28,
            fiber: 1.0,
            protein: 5.5,
            salt: 0.15,
        },
    },
    {
        id: 'office-box-24',
        name: 'Office Box · 24 buc',
        category: 'office-box',
        price: 300,
        unit: 'cutie',
        minQty: 1,
        step: 1,
        description: 'Cutie cu 24 de mini-prăjituri artizanale — pentru firmele cu echipe mari care știu că oamenii fericiți muncesc mai bine.',
        emoji: '🎉',
        bg: '#FEE8F1',
        badge: null,
        weightNote: false,
        officeBox: true,
        pieces: 24,
        images: ['images/products/cupcakes.png', 'images/products/tort-felie.png', 'images/products/cookies.png'],
        ingredients: 'Mix de mini-prăjituri (compoziție variabilă în funcție de selecție): ouă*, făină de grâu*, zahăr, unt* (lapte*), ciocolată, fructe proaspete, cremă de vanilie (lapte*). Compoziția exactă depinde de selecția zilei.',
        allergens: ['Gluten (grâu)', 'Ouă', 'Lapte', 'Nuci (posibil)'],
        nutritional: {
            per: '100g',
            energy_kcal: 340,
            energy_kj: 1423,
            fat: 18,
            saturated_fat: 10,
            carbs: 40,
            sugars: 28,
            fiber: 1.0,
            protein: 5.5,
            salt: 0.15,
        },
    },

    /* ── Vegan & Raw ─────────────────────────────────── */
    {
        id: 'tort-ciocolata-raw',
        name: 'Tort Ciocolată Raw',
        category: 'vegan-raw',
        price: 190,
        unit: 'kg',
        minQty: 1.2,
        description: 'Bază de curmale și caju, umplutură raw de cacao și avocado. 100% plant-based, fără zahăr rafinat, fără coacere.',
        emoji: '🌱',
        bg: '#E8F7E8',
        badge: 'Vegan',
        weightNote: true,
        images: ['images/products/tort-felie.png', 'images/products/cookies.png', 'images/products/cupcakes.png'],
        ingredients: 'Curmale Medjool, caju crud, cacao raw (pulbere), avocado copt, sirop de arțar pur, ulei de cocos presat la rece, extract de vanilie Bourbon, sare de Himalaya. Toate ingredientele sunt 100% naturale, fără aditivi sau conservanți.',
        allergens: ['Nuci (caju)'],
        nutritional: {
            per: '100g',
            energy_kcal: 340,
            energy_kj: 1423,
            fat: 22,
            saturated_fat: 11,
            carbs: 32,
            sugars: 24,
            fiber: 4.5,
            protein: 5.8,
            salt: 0.05,
        },
    },
    {
        id: 'tort-fructe-padure-raw',
        name: 'Tort Fructe Pădure Raw',
        category: 'vegan-raw',
        price: 200,
        unit: 'kg',
        minQty: 1.2,
        description: 'Cremă de caju cu coulis de zmeură și mure, pe bază de nuci și curmale. Fără gluten, fără lactate, fără coacere.',
        emoji: '🫐',
        bg: '#F0E8F5',
        badge: 'Raw Vegan',
        weightNote: true,
        images: ['images/products/cookies.png', 'images/products/cupcakes.png', 'images/products/tort-felie.png'],
        ingredients: 'Caju crud, curmale Medjool, nuci crude*, zmeură proaspătă, mure, sirop de agave, ulei de cocos presat la rece, suc de lămâie, extract de vanilie Bourbon, sare de Himalaya.',
        allergens: ['Nuci (caju, nuci)'],
        nutritional: {
            per: '100g',
            energy_kcal: 310,
            energy_kj: 1297,
            fat: 19,
            saturated_fat: 9,
            carbs: 30,
            sugars: 22,
            fiber: 5.2,
            protein: 6.1,
            salt: 0.04,
        },
    },
];

// Injectăm id = slug pentru compatibilitate cu coșul
const _LOCAL_PRODUCTS = _LOCAL_PRODUCTS_RAW.map(p => ({ ...p, id: p.id ?? p.slug ?? p.id }));

/* ── Cache live (populat de fetchProducts) ──────────── */
let _cache = [..._LOCAL_PRODUCTS];

/* ── Fetch async din Supabase ───────────────────────── */
async function fetchProducts(category = 'toate') {
    try {
        const db = window._biocakeSupabase;
        if (!db) throw new Error('Supabase client not ready');

        let query = db
            .from('products')
            .select('*')
            .eq('active', true)
            .order('name', { ascending: true });

        if (category !== 'toate') query = query.eq('category', category);

        const { data, error } = await query;
        if (error) throw error;

        const products = data.map(_mapRow);

        // Actualizează cache-ul global
        if (category === 'toate') {
            _cache = products;
        } else {
            // Înlocuiește produsele din această categorie în cache
            _cache = [
                ..._cache.filter(p => p.category !== category),
                ...products,
            ];
        }

        return products;
    } catch (err) {
        console.warn('[BioCake] Supabase fetch failed, using local data:', err.message);
        return _getLocal(category);
    }
}

/* ── Acces sync (din cache) ─────────────────────────── */
function getProducts(category = 'toate') {
    if (category === 'toate') return _cache;
    return _cache.filter(p => p.category === category);
}

function getProductById(id) {
    return _cache.find(p => p.id === id || p.slug === id) ?? null;
}

function _getLocal(category = 'toate') {
    if (category === 'toate') return _LOCAL_PRODUCTS;
    return _LOCAL_PRODUCTS.filter(p => p.category === category);
}
