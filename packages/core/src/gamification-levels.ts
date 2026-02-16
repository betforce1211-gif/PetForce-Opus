// 100 gamification levels with polynomial XP curve: round(15 * level^2)
// Level 1 starts at 0, each subsequent level requires more XP.

export const GAMIFICATION_LEVELS = Array.from({ length: 100 }, (_, i) => ({
  level: i + 1,
  xpThreshold: i === 0 ? 0 : Math.round(15 * (i + 1) ** 2),
})) as readonly { level: number; xpThreshold: number }[];

// 8 tracks × 100 names each — first 10 entries preserve original names
export const GAMIFICATION_LEVEL_NAMES: Record<string, readonly string[]> = {
  member: [
    // 1-10 (original)
    "Helping Hand", "Caring Rookie", "Devoted Carer", "Nurture Pro",
    "Guardian Angel", "Care Captain", "Welfare Wizard", "Compassion Champion",
    "Master Caretaker", "Legendary Guardian",
    // 11-20
    "Steadfast Ally", "Gentle Shepherd", "Trusted Steward", "Care Artisan",
    "Heart Healer", "Devoted Sentinel", "Empathy Expert", "Kindness Knight",
    "Nurture Sage", "Wellness Warden",
    // 21-30
    "Soul Keeper", "Love Luminary", "Benevolent Baron", "Harmony Herald",
    "Grace Guardian", "Virtue Vanguard", "Mercy Master", "Hope Harbinger",
    "Spirit Shield", "Bond Breaker",
    // 31-40
    "Compassion Crown", "Noble Nurturer", "Devoted Duke", "Faith Forger",
    "Haven Hero", "Sanctuary Sage", "Peace Paladin", "Valor Vessel",
    "Cherish Chief", "Altruism Ace",
    // 41-50
    "Guardian General", "Benevolence Baron", "Eternal Empath", "Heart Sovereign",
    "Devotion Deity", "Sacred Shepherd", "Cosmic Carer", "Infinite Nurturer",
    "Love Legend", "Soul Sovereign",
    // 51-60
    "Starlight Steward", "Phoenix Patron", "Celestial Carer", "Radiant Ruler",
    "Divine Defender", "Astral Ally", "Mythic Mender", "Ethereal Elder",
    "Transcendent Tender", "Hallowed Heart",
    // 61-70
    "Pinnacle Protector", "Supreme Shepherd", "Exalted Empath", "Grand Guardian",
    "Regal Restorer", "Imperial Idealist", "Sovereign Saint", "Majestic Mentor",
    "Paramount Patron", "Prime Peacekeeper",
    // 71-80
    "Zenith Zealot", "Apex Altruist", "Crown Custodian", "Diamond Defender",
    "Elite Emissary", "Platinum Patron", "Titan Tender", "Omega Overseer",
    "Paragon Pioneer", "Legend Lord",
    // 81-90
    "Mythic Marshal", "Astral Archon", "Celestial Commander", "Divine Director",
    "Eternal Emperor", "Infinity Icon", "Galaxy Guardian", "Universal Upholder",
    "Cosmic Champion", "Stellar Sovereign",
    // 91-100
    "Timeless Titan", "Boundless Benefactor", "Immortal Idealist", "Absolute Altruist",
    "Infinite Inspirer", "Ultimate Unifier", "Supreme Soul", "Transcendent Titan",
    "Eternal Exemplar", "Eternal Guardian",
  ],
  household: [
    // 1-10 (original)
    "Starter Home", "Cozy Cottage", "Family Nest", "Townhouse",
    "Garden Villa", "Country Manor", "Estate House", "Grand Manor",
    "Luxury Estate", "Dream Palace",
    // 11-20
    "Hilltop Haven", "Riverside Lodge", "Sunlit Retreat", "Ivy Manor",
    "Woodland Cabin", "Lakeside Villa", "Autumn Lodge", "Stone Keep",
    "Meadow Mansion", "Highland Hall",
    // 21-30
    "Marble Manor", "Sapphire Suite", "Golden Gate", "Crystal Court",
    "Emerald Estate", "Ruby Residence", "Diamond Den", "Platinum Place",
    "Topaz Tower", "Opal Oasis",
    // 31-40
    "Enchanted Estate", "Mystic Manor", "Shadow Hall", "Moonlit Mansion",
    "Starfall Lodge", "Twilight Tower", "Phoenix Hall", "Dragon Keep",
    "Thunderstone", "Tempest Tower",
    // 41-50
    "Royal Residence", "Imperial Inn", "Sovereign Suite", "Regal Retreat",
    "Noble Nest", "Crown Castle", "Kingdom Keep", "Throne Tower",
    "Majestic Manor", "Dynasty Den",
    // 51-60
    "Celestial Citadel", "Astral Abode", "Nebula Nest", "Cosmic Castle",
    "Stellar Stronghold", "Galaxy Grounds", "Lunar Lodge", "Solar Sanctuary",
    "Orbital Oasis", "Starlight Spire",
    // 61-70
    "Eden Estate", "Paradise Plaza", "Utopia Villa", "Nirvana Nest",
    "Elysium Estate", "Arcadia Abbey", "Valhalla Villa", "Olympus Outpost",
    "Shangri-La Suite", "Avalon Abode",
    // 71-80
    "Infinity Inn", "Eternal Estate", "Timeless Tower", "Ageless Alcazar",
    "Immortal Isle", "Legend Lodge", "Mythic Mansion", "Fable Fortress",
    "Saga Stronghold", "Epic Estate",
    // 81-90
    "Titan Tower", "Apex Abode", "Zenith Zone", "Pinnacle Palace",
    "Summit Suite", "Vertex Villa", "Paragon Place", "Omega Oasis",
    "Prime Palace", "Ultra Utopia",
    // 91-100
    "Supreme Sanctuary", "Absolute Abode", "Transcendent Tower", "Infinite Inn",
    "Boundless Bastion", "Universal Utopia", "Cosmic Crown", "Stellar Summit",
    "Eternal Eden", "Celestial Palace",
  ],
  dog: [
    // 1-10 (original)
    "Puppy Pal", "Treat Tosser", "Belly Rubber", "Fetch Champion",
    "Pack Leader", "Kibble King", "Good Boy Guru", "Paw Protector",
    "Bark Boss", "Top Dog",
    // 11-20
    "Tail Wagger", "Snoot Booper", "Zoomie Zealot", "Biscuit Baron",
    "Leash Lord", "Howl Hero", "Dig Master", "Sit-Stay Sage",
    "Trick Trainer", "Furball Foreman",
    // 21-30
    "Agility Ace", "Rally Ruler", "Dock Diver", "Frisbee Fanatic",
    "Herding Hero", "Tracking Titan", "Scent Seeker", "Obedience Oracle",
    "Canine Captain", "Retriever Royal",
    // 31-40
    "Hound Handler", "Terrier Tamer", "Spaniel Sage", "Collie Commander",
    "Shepherd Supreme", "Beagle Boss", "Husky Hero", "Labrador Legend",
    "Pointer Prince", "Setter Saint",
    // 41-50
    "K-9 Knight", "Mutt Marshal", "Doggo Duke", "Pupper Prince",
    "Hound Highlander", "Canine Crusader", "Bark Baron", "Woof Warrior",
    "Paws Paladin", "Sniff Sovereign",
    // 51-60
    "Alpha Apex", "Pack Paragon", "Wolf Whisperer", "Den Defender",
    "Kennel King", "Champion Chaser", "Doggy Dynamo", "Fur Force",
    "Canine Conqueror", "Paw Prodigy",
    // 61-70
    "Golden Guardian", "Diamond Dog", "Platinum Pup", "Sapphire Snout",
    "Ruby Rover", "Emerald Ears", "Crystal Canine", "Titanium Terrier",
    "Obsidian Hound", "Ivory Ibizan",
    // 71-80
    "Mythic Mutt", "Legendary Lab", "Epic Ears", "Fabled Fido",
    "Ancient Alpha", "Saga Spot", "Cosmic Canine", "Stellar Setter",
    "Nebula Nose", "Galaxy Greyhound",
    // 81-90
    "Phoenix Pup", "Dragon Dog", "Thunder Tail", "Storm Snout",
    "Blaze Bark", "Frost Fang", "Shadow Shiba", "Eclipse Ears",
    "Vortex Vizsla", "Tempest Terrier",
    // 91-100
    "Titan Tail", "Apex Alpha", "Zenith Zephyr", "Pinnacle Paw",
    "Omega Outlaw", "Supreme Snout", "Infinite Inu", "Eternal Ears",
    "Ultimate Underdog", "Legendary Lodestar",
  ],
  cat: [
    // 1-10 (original)
    "Kitten Keeper", "Yarn Wrangler", "Purr Whisperer", "Nap Master",
    "Whisker Wizard", "Catnip Commander", "Feline Sage", "Shadow Stalker",
    "Cat Emperor", "Meow Legend",
    // 11-20
    "Scratch Scholar", "Pounce Pro", "Lap Lord", "Chirp Champion",
    "Tail Twitcher", "Box Baron", "String Slayer", "Tuna Titan",
    "Moonlight Mouser", "Curtain Climber",
    // 21-30
    "Sphinx Scholar", "Persian Prince", "Bengal Boss", "Ragdoll Royal",
    "Siamese Sage", "Maine Master", "Sphynx Sultan", "Tabby Titan",
    "Calico Chief", "Tortie Tycoon",
    // 31-40
    "Night Ninja", "Silent Stalker", "Graceful Ghost", "Velvet Viper",
    "Stealthy Shade", "Feline Phantom", "Whiskered Wraith", "Padded Prowler",
    "Twilight Tiger", "Midnight Mystic",
    // 41-50
    "Claw Commander", "Hiss Hero", "Furball Pharaoh", "Paw Potentate",
    "Meow Monarch", "Purr President", "Feline Feudal", "Cat Czar",
    "Whisker Warlord", "Tail Tyrant",
    // 51-60
    "Crystal Cat", "Diamond Duchess", "Sapphire Siamese", "Ruby Ragdoll",
    "Emerald Ears", "Platinum Paws", "Golden Gaze", "Silver Stripes",
    "Opal Oracle", "Topaz Tabby",
    // 61-70
    "Astral Abyssinian", "Cosmic Calico", "Nebula Nose", "Stellar Sphynx",
    "Lunar Lynx", "Solar Savannah", "Eclipse Eye", "Meteor Maine",
    "Galaxy Gaze", "Starlight Stripe",
    // 71-80
    "Phoenix Feline", "Dragon Duchess", "Thunder Tabby", "Storm Stripe",
    "Blaze Bengal", "Frost Fur", "Shadow Sphinx", "Tempest Tail",
    "Vortex Velvet", "Lightning Lynx",
    // 81-90
    "Mythic Mouser", "Legend Lynx", "Epic Ears", "Fabled Feline",
    "Ancient Ancestor", "Saga Stripe", "Titan Tabby", "Apex Angora",
    "Zenith Zephyr", "Pinnacle Paws",
    // 91-100
    "Omega Oracle", "Supreme Sable", "Paragon Purr", "Infinite Iris",
    "Eternal Elegance", "Boundless Bengal", "Immortal Iris", "Absolute Aristocat",
    "Ultimate Unity", "Celestial Cat",
  ],
  bird: [
    // 1-10 (original)
    "Fledgling Friend", "Seed Scatterer", "Perch Pal", "Tweet Tender",
    "Feather Keeper", "Aviary Ace", "Wing Commander", "Sky Shepherd",
    "Flight Master", "Legendary Avian",
    // 11-20
    "Chirp Champ", "Beak Boss", "Nest Nurturer", "Plume Pro",
    "Song Sage", "Treetop Tenant", "Canary Captain", "Finch Foreman",
    "Budgie Baron", "Cockatiel Chief",
    // 21-30
    "Parrot Prince", "Macaw Marshal", "Cockatoo Commander", "Lovebird Lord",
    "Conure Captain", "Parakeet Paladin", "Lorikeet Legend", "Dove Duke",
    "Falcon Fan", "Eagle Eye",
    // 31-40
    "Talon Tactician", "Crest Commander", "Plumage Prime", "Wingtip Wizard",
    "Hollow Hawk", "Swooping Sage", "Gliding Guardian", "Soaring Saint",
    "Thermal Thane", "Aerial Artisan",
    // 41-50
    "Feather Pharaoh", "Plume Potentate", "Beak Brigadier", "Wing Warden",
    "Flock Forger", "Avian Admiral", "Nest Noble", "Perch Premier",
    "Song Sovereign", "Chirp Chancellor",
    // 51-60
    "Crystal Cardinal", "Diamond Dove", "Sapphire Swallow", "Ruby Robin",
    "Emerald Eagle", "Platinum Pigeon", "Golden Goldfinch", "Silver Sparrow",
    "Opal Oriole", "Topaz Toucan",
    // 61-70
    "Stellar Starling", "Cosmic Crane", "Nebula Nightingale", "Lunar Lark",
    "Solar Swift", "Astral Albatross", "Galaxy Goose", "Eclipse Eagle",
    "Meteor Magpie", "Aurora Avocet",
    // 71-80
    "Phoenix Finch", "Dragon Duck", "Thunder Thrush", "Storm Stork",
    "Blaze Bunting", "Frost Falcon", "Shadow Shrike", "Tempest Tern",
    "Vortex Vulture", "Lightning Loon",
    // 81-90
    "Mythic Martin", "Legend Lovebird", "Epic Egret", "Fabled Flamingo",
    "Ancient Auk", "Saga Sandpiper", "Titan Tanager", "Apex Avocet",
    "Zenith Zebra Finch", "Pinnacle Pelican",
    // 91-100
    "Omega Osprey", "Supreme Swiftlet", "Paragon Peregrine", "Infinite Ibis",
    "Eternal Erne", "Boundless Bustard", "Immortal Iora", "Absolute Avian",
    "Ultimate Upupa", "Celestial Crane",
  ],
  fish: [
    // 1-10 (original)
    "Guppy Guide", "Bubble Buddy", "Tank Tender", "Reef Ranger",
    "Current Keeper", "Aqua Ace", "Tide Master", "Coral Commander",
    "Deep Sea Guardian", "Ocean Legend",
    // 11-20
    "Scale Scholar", "Fin Foreman", "Wave Watcher", "Splash Sage",
    "Stream Steward", "Pond Patron", "Brook Boss", "Lake Lord",
    "River Ruler", "Lagoon Legend",
    // 21-30
    "Betta Baron", "Goldfish Guru", "Tetra Titan", "Gourami Guide",
    "Cichlid Chief", "Pleco Prince", "Angelfish Ace", "Discus Duke",
    "Molly Master", "Swordtail Sage",
    // 31-40
    "Kelp Keeper", "Seaweed Sage", "Anemone Artisan", "Barnacle Baron",
    "Conch Commander", "Driftwood Duke", "Estuary Elder", "Filter Foreman",
    "Gravel Guardian", "Heater Hero",
    // 41-50
    "Fin Pharaoh", "Scale Sovereign", "Gill General", "Swim Sultan",
    "Current Crown", "Ripple Regent", "Tide Tycoon", "Splash Supreme",
    "Aqua Admiral", "Flow Feudal",
    // 51-60
    "Crystal Clownfish", "Diamond Discus", "Sapphire Shark", "Ruby Rasbora",
    "Emerald Eel", "Platinum Pleco", "Golden Guppy", "Silver Sailfin",
    "Opal Oscar", "Topaz Tang",
    // 61-70
    "Stellar Starfish", "Cosmic Catfish", "Nebula Neon", "Lunar Loach",
    "Solar Seahorse", "Astral Arowana", "Galaxy Goldfish", "Eclipse Eel",
    "Meteor Molly", "Aurora Angel",
    // 71-80
    "Phoenix Pike", "Dragon Danio", "Thunder Tetra", "Storm Sturgeon",
    "Blaze Bass", "Frost Flounder", "Shadow Shark", "Tempest Trout",
    "Vortex Viperfish", "Lightning Lionfish",
    // 81-90
    "Mythic Marlin", "Legend Lionfish", "Epic Eel", "Fabled Fugu",
    "Ancient Axolotl", "Saga Salmon", "Titan Tuna", "Apex Angler",
    "Zenith Zebrafish", "Pinnacle Piranha",
    // 91-100
    "Omega Orca", "Supreme Swordfish", "Paragon Pike", "Infinite Ichthys",
    "Eternal Eel", "Boundless Barracuda", "Immortal Isopod", "Absolute Abyssal",
    "Ultimate Urchin", "Celestial Coelacanth",
  ],
  reptile: [
    // 1-10 (original)
    "Scale Starter", "Basking Buddy", "Terrarium Tender", "Shell Shield",
    "Reptile Ranger", "Lizard Lord", "Dragon Keeper", "Scale Sage",
    "Ancient Guardian", "Reptile Legend",
    // 11-20
    "Gecko Guide", "Iguana Idol", "Chameleon Chief", "Python Prince",
    "Tortoise Titan", "Skink Sage", "Monitor Marshal", "Anole Ace",
    "Bearded Baron", "Corn Commander",
    // 21-30
    "Crested Captain", "Ball Boss", "Leopard Lord", "King Knight",
    "Royal Regent", "Tokay Tycoon", "Uromastyx Ultra", "Veiled Vanguard",
    "Water Warden", "Tegu Thane",
    // 31-40
    "Heat Herder", "UVB Usher", "Substrate Sage", "Humidity Hero",
    "Thermal Thane", "Misting Marshal", "Burrow Boss", "Climbing Commander",
    "Shedding Sage", "Feeding Foreman",
    // 41-50
    "Scale Sovereign", "Claw Czar", "Tail Tyrant", "Fang Feudal",
    "Coil Crown", "Slither Sultan", "Hiss Highness", "Tongue Tycoon",
    "Venom Viceroy", "Belly Baron",
    // 51-60
    "Crystal Cobra", "Diamond Dragon", "Sapphire Serpent", "Ruby Rattler",
    "Emerald Eft", "Platinum Python", "Golden Gecko", "Silver Slider",
    "Opal Ouroboros", "Topaz Tortoise",
    // 61-70
    "Stellar Skink", "Cosmic Chameleon", "Nebula Newt", "Lunar Lizard",
    "Solar Serpent", "Astral Alligator", "Galaxy Gecko", "Eclipse Eft",
    "Meteor Monitor", "Aurora Anaconda",
    // 71-80
    "Phoenix Python", "Dragon Drake", "Thunder Turtle", "Storm Snake",
    "Blaze Boa", "Frost Frog", "Shadow Serpent", "Tempest Tuatara",
    "Vortex Viper", "Lightning Lizard",
    // 81-90
    "Mythic Monitor", "Legend Lizard", "Epic Eft", "Fabled Frill",
    "Ancient Asp", "Saga Salamander", "Titan Tortoise", "Apex Adder",
    "Zenith Zonosaur", "Pinnacle Python",
    // 91-100
    "Omega Ouroboros", "Supreme Serpent", "Paragon Python", "Infinite Iguana",
    "Eternal Eft", "Boundless Boa", "Immortal Iguana", "Absolute Archosaur",
    "Ultimate Uromastyx", "Celestial Croc",
  ],
  other: [
    // 1-10 (original)
    "Pet Pal", "Care Starter", "Gentle Keeper", "Nurture Guide",
    "Animal Ally", "Critter Captain", "Creature Sage", "Wild Whisperer",
    "Nature Guardian", "Pet Legend",
    // 11-20
    "Fur Friend", "Paw Partner", "Snuggle Scout", "Cuddle Cadet",
    "Whisker Ward", "Tiny Tender", "Pocket Pal", "Little Lord",
    "Fuzzy Foreman", "Fluff Finder",
    // 21-30
    "Hamster Hero", "Bunny Boss", "Ferret Fan", "Guinea Guide",
    "Hedgehog Herald", "Chinchilla Chief", "Sugar Sage", "Rat Ruler",
    "Gerbil Guardian", "Mouse Master",
    // 31-40
    "Bedding Baron", "Wheel Warden", "Tunnel Titan", "Burrow Boss",
    "Hideaway Hero", "Nesting Ninja", "Foraging Foreman", "Exercise Elder",
    "Enrichment Expert", "Habitat Hero",
    // 41-50
    "Critter Crown", "Fur Feudal", "Paw Pharaoh", "Snout Sultan",
    "Whisker Warlord", "Tail Tycoon", "Ear Emperor", "Nose Noble",
    "Claw Commander", "Pelt Premier",
    // 51-60
    "Crystal Critter", "Diamond Den", "Sapphire Snuggle", "Ruby Runner",
    "Emerald Exercise", "Platinum Pet", "Golden Guardian", "Silver Snout",
    "Opal Outpost", "Topaz Tender",
    // 61-70
    "Stellar Sprout", "Cosmic Creature", "Nebula Nester", "Lunar Lover",
    "Solar Snuggler", "Astral Animal", "Galaxy Guide", "Eclipse Elder",
    "Meteor Mentor", "Aurora Ally",
    // 71-80
    "Phoenix Friend", "Dragon Dote", "Thunder Tender", "Storm Steward",
    "Blaze Buddy", "Frost Friend", "Shadow Shepherd", "Tempest Tender",
    "Vortex Vet", "Lightning Love",
    // 81-90
    "Mythic Minder", "Legend Lover", "Epic Elder", "Fabled Friend",
    "Ancient Ally", "Saga Steward", "Titan Tender", "Apex Advocate",
    "Zenith Zealot", "Pinnacle Patron",
    // 91-100
    "Omega Oracle", "Supreme Steward", "Paragon Partner", "Infinite Inspirer",
    "Eternal Elder", "Boundless Bond", "Immortal Inspirer", "Absolute Advocate",
    "Ultimate Unity", "Celestial Companion",
  ],
};
