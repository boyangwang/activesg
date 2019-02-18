if (!process.argv.length < 3) {
  console.warn('Usage: fetch-requests.js activesg-username activesg-password');
  process.exit(1);
}
const username = process.argv(1);
const password = process.argv(2);

console.log('XXXTEMP', process.argv)
