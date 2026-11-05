export const STADIUMS = [
  {
    id: "arena",
    name: "Penalty Arena",
    city: "The original ground",
    description: "An open bowl, mountain views and a match-day atmosphere.",
    color: "#70e3af",
    seatColor: 0x309976,
    awaySeatColor: 0xe8e1cc,
    sky: 0xaacddc,
  },
  {
    id: "san-siro",
    name: "San Siro",
    city: "Milan, Italy",
    description: "Three complete rectangular floors, broad spiral towers and red roof trim.",
    color: "#ff8275",
    seatColor: 0xc7493e,
    awaySeatColor: 0x334760,
    sky: 0xb5d5e4,
  },
  {
    id: "stamford-bridge",
    name: "Stamford Bridge",
    city: "London, England",
    description: "Enclosed blue-and-white stands, steel roof trusses and London terraces.",
    color: "#8ab9ff",
    seatColor: 0x2360c4,
    awaySeatColor: 0x4b8be0,
    sky: 0xb4c8d6,
  },
] as const;

export type StadiumId = (typeof STADIUMS)[number]["id"];
export const getStadium = (id: StadiumId) => STADIUMS.find(stadium => stadium.id === id) ?? STADIUMS[0];
