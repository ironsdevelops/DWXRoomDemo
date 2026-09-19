// One entry per room. The key is the URL path, so /newton-room and /eux-g-boardroom
// each load their own room. roomId must match cra04_room_id on the DemoRooms rows in Dataverse.
//
//   screens         1 or 2 wall displays
//   videoBarWidth   width of the video bar in the 3D scene (metres, roughly)
//   location        optional extra badge in the header
//   windowView      'london' (default) or 'parkland'
//   theme           optional overrides for wall, wood, chair, rug, rugBorder and plant
//                   ('rubber' or 'snake'); anything left out uses the boardroom look
export const ROOMS = {
  'newton-room': {
    roomId: 'MTR-09',
    displayName: 'The Newton Room',
    roomType: 'Meeting Room',
    capacity: 8,
    location: 'Floor 3, North',
    screens: 1,
    videoBarWidth: 0.8,
    windowView: 'parkland',
    theme: {
      wall: '#EFEDE6',
      wood: '#8A6A4A',
      chair: '#1F5F6B',
      rug: '#B4AE9F',
      rugBorder: '#D2CDBF',
      plant: 'snake',
    },
  },
  'eux-g-boardroom': {
    roomId: 'EUX-G-Boardroom',
    displayName: 'EUX-G-Boardroom',
    roomType: 'Boardroom',
    capacity: 8,
    screens: 2,
    videoBarWidth: 0.9,
    windowView: 'london',
  },
};

// Shown when the URL doesn't match a room, for example the site root.
export const DEFAULT_ROOM = 'newton-room';
