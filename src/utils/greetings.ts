export function getGreeting(name = "Commander") {
  const hour = new Date().getHours();

  let greeting = "Hello";

  if (hour >= 5 && hour < 12) {
    greeting = "Good Morning";
  } else if (hour < 17) {
    greeting = "Good Afternoon";
  } else if (hour < 21) {
    greeting = "Good Evening";
  } else {
    greeting = "Good Night";
  }

  const messages = [
    "Ready to build something amazing today?",
    "Let's ship some great features.",
    "Your CMS is looking fantastic.",
    "Time to make CloudTweak even better.",
    "Let's keep the momentum going!",
  ];

  const message = messages[Math.floor(Math.random() * messages.length)];

  return {
    greeting: `${greeting}, ${name} 👋`,
    message,
  };
}
