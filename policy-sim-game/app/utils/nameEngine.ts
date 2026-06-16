const firstNames = [
  "Oliver", "George", "Noah", "Arthur", "Leo",
  "Jack", "Harry", "Charlie", "Oscar", "Henry",
  "Muhammad", "Mohammed", "Ahmed", "Ali", "Omar",
  "James", "Thomas", "William", "Jacob", "Lucas",
  "Ethan", "Benjamin", "Daniel", "Samuel", "Adam",

  "Olivia", "Amelia", "Isla", "Ava", "Emily",
  "Sophia", "Grace", "Lily", "Freya", "Ella",
  "Charlotte", "Mia", "Evie", "Rosie", "Poppy",
  "Aisha", "Fatima", "Zainab", "Mariam", "Yasmin",
  "Priya", "Anaya", "Meera", "Saanvi", "Aarav",

  "Liam", "Mason", "Logan", "Finn", "Theodore",
  "Harrison", "Archie", "Max", "Alexander", "Isaac",
  "Amir", "Bilal", "Hamza", "Yusuf", "Ibrahim",
  "Nathan", "Joseph", "Ryan", "Callum", "Dylan",

  "Sophie", "Chloe", "Jessica", "Ruby", "Phoebe",
  "Hannah", "Abigail", "Molly", "Layla", "Zara",
  "Leah", "Nadia", "Aaliyah", "Sara", "Inaya",
  "Anita", "Riya", "Kiran", "Jasmine", "Neha"
];

const lastNames = [
  "Smith", "Jones", "Taylor", "Brown", "Williams",
  "Wilson", "Johnson", "Davies", "Evans", "Thomas",
  "Roberts", "Walker", "Wright", "Thompson", "White",
  "Edwards", "Hughes", "Green", "Hall", "Wood",
  "Clarke", "Jackson", "Harris", "Lewis", "Martin",

  "Patel", "Shah", "Desai", "Mehta", "Kapoor",
  "Singh", "Kaur", "Gill", "Dhillon", "Sandhu",
  "Ahmed", "Ali", "Khan", "Hussain", "Rahman",
  "Chowdhury", "Begum", "Islam", "Uddin", "Mahmood",

  "Murphy", "Kelly", "O'Brien", "Walsh", "Byrne",
  "Doyle", "McCarthy", "Ryan", "Gallagher", "Kennedy",

  "Wong", "Chan", "Chen", "Lin", "Liu",
  "Nguyen", "Tran", "Pham", "Le", "Vo",

  "Campbell", "Stewart", "Anderson", "Morrison", "MacDonald",
  "Baker", "Cooper", "Parker", "Price", "Russell",
  "Morgan", "Bennett", "Carter", "Phillips", "Reed",
  "Sullivan", "Foster", "Ward", "Griffiths", "Webb"
];

export function generateVoterName(id: number): string {
  const firstIndex = (id * 13) % firstNames.length;
  const lastIndex = (id * 17) % lastNames.length;
  return `${firstNames[firstIndex]} ${lastNames[lastIndex]}`;
}