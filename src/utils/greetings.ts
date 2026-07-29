export function getGreeting(name = "Commander") {
  const hour = new Date().getHours();

  let greeting = "Hello";

  if (hour >= 5 && hour < 12) {
    greeting = "Good Morning";
  } else if (hour >= 12 && hour < 17) {
    greeting = "Good Afternoon";
  } else if (hour >= 17 && hour < 21) {
    greeting = "Good Evening";
  } else {
    greeting = "Good Night";
  }

  const messages = [
    "The Lord shall fight for me and I will hold my peace - Exo. 14.14",
    "The thoughts God has for me are of good and not evil to give me an expected end - Jer 29:11",
    "I am like the tree planted by the rivers of living waters - Psa 1:3",
    "God shall restore my lost years in 7 folds - Joel 2:25",
    "God shall sustain me, carry me and rescue me - Isa 46:4",
    "Appollos watereth, but God giveth increase - 1 Cor 3:6",
    "I am the apple of God's Eye - Psa 17:8",
  ];

  const message = messages[Math.floor(Math.random() * messages.length)];

  return {
    greeting: `${greeting}, ${name} 👋`,
    message,
  };
}
