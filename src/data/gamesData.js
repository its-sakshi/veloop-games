const titles = [
  ["Blade Master", "Action"],
  ["Nutcraft", "Puzzle"],
  ["Bowlexa", "Arcade"],
  ["Block Crush", "Puzzle"],
  ["Slice Storm", "Action"],
  ["Cosmo Warrior", "Action"],
  ["Toilet Tactics", "Strategy"],
  ["Word Hunt", "Puzzle"],
  ["Bubble Blast Legend", "Arcade"],
  ["Merge Master", "Puzzle"],
  ["Wormzy", "Puzzle"],
  ["Aqua Fill", "Puzzle"],
  ["Realm Clash", "Strategy"],
];
const games = titles.map(([name, category], index) => ({
  id: index + 1,
  name,
  category,
  image: `/assets/games/${index + 1}.jpeg`,
}));
export default games;
