export const MOCK_MACHINES = [
  {
    id: "local-1",
    name: "Hydraulic Press #08",
    machine_type: "Hydraulic Press",
    oem: "Hydra-Tech Germany",
    model_year: 1998,
    condition_score: 45,
  },
  {
    id: "local-2",
    name: "CNC Mill X-200",
    machine_type: "CNC Concentric",
    oem: "Siemens Industrial",
    model_year: 2015,
    condition_score: 92,
  },
  {
    id: "local-3",
    name: "Backup Generator G-5",
    machine_type: "Generator",
    oem: "Caterpillar",
    model_year: 2020,
    condition_score: 98,
  },
];

export const MOCK_MESSAGES = [
  {
    id: 101,
    chatId: 1,
    sender: "expert",
    text: "Systems check complete. We are seeing some pressure variance.",
    time: "10:04 AM",
  },
  {
    id: 102,
    chatId: 1,
    sender: "user",
    text: "Noted. Is it critical?",
    time: "10:12 AM",
  },
  {
    id: 103,
    chatId: 1,
    sender: "expert",
    text: "Not yet, but we recommend scheduling a valve seal replacement.",
    time: "10:15 AM",
  },
  {
    id: 104,
    chatId: 1,
    sender: "expert",
    text: '[INVOICE]:{"amount":"4500", "desc":"Valve Seal Replacement"}',
    type: "invoice",
    amount: "4500",
    desc: "Valve Seal Replacement",
    time: "10:18 AM",
  },
];

export const simulatedAccounts = [
  {
    name: "Bhuvan B H",
    email: "bhuvan@indease.com",
    avatar:
      "https://ui-avatars.com/api/?name=Bhuvan+BH&background=020617&color=fff",
  },
  {
    name: "Technical Admin",
    email: "admin@indease.com",
    avatar:
      "https://ui-avatars.com/api/?name=Admin&background=1e293b&color=fff",
  },
  {
    name: "Industrial Guest",
    email: "guest.identity@industries.in",
    avatar:
      "https://ui-avatars.com/api/?name=Guest&background=334155&color=fff",
  },
];
