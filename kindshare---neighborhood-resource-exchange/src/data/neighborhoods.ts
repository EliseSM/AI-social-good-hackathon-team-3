import { Neighborhood } from '../types/resource';

export const NEIGHBORHOODS: Neighborhood[] = [
  {
    id: 'mission',
    name: 'Mission District',
    city: 'San Francisco, CA',
    hexId: 'hex-8828308281',
    centerLat: 37.7599,
    centerLng: -122.4148,
    radiusKm: 0.8,
    safeHandoffHubs: [
      {
        id: 'hub-m1',
        name: 'Valencia Community Fridge & Pantry',
        type: 'fridge',
        address: '968 Valencia St',
        safetyFeatures: ['Open 24/7', 'Well-lit street front', 'High pedestrian foot traffic'],
        coordinates: { lat: 37.7585, lng: -122.4215 },
        openHours: '24 Hours Daily'
      },
      {
        id: 'hub-m2',
        name: 'Mission Branch Public Library',
        type: 'library',
        address: '300 Bartlett St',
        safetyFeatures: ['Staffed civic building', 'Security desk', 'Public seating area'],
        coordinates: { lat: 37.7525, lng: -122.4195 },
        openHours: 'Mon-Sat 10am - 6pm'
      },
      {
        id: 'hub-m3',
        name: '16th St Mission BART Station Plaza',
        type: 'transit',
        address: '2000 Mission St',
        safetyFeatures: ['Well-lit transit plaza', 'Active public transit hub', 'Public call box nearby'],
        coordinates: { lat: 37.7649, lng: -122.4198 },
        openHours: '5:00 AM - 1:00 AM'
      }
    ]
  },
  {
    id: 'soma',
    name: 'SOMA (South of Market)',
    city: 'San Francisco, CA',
    hexId: 'hex-8828308293',
    centerLat: 37.7785,
    centerLng: -122.4056,
    radiusKm: 0.9,
    safeHandoffHubs: [
      {
        id: 'hub-s1',
        name: 'Gene Friend Recreation Center Plaza',
        type: 'civic',
        address: '270 6th St',
        safetyFeatures: ['Community center front', 'Wide open daylight area', 'Parks & Rec staff'],
        coordinates: { lat: 37.7792, lng: -122.4071 },
        openHours: '9:00 AM - 8:00 PM'
      },
      {
        id: 'hub-s2',
        name: 'SOMA West Community Free Pantry',
        type: 'fridge',
        address: 'Folsom St & 8th St',
        safetyFeatures: ['Public street lighting', 'Clean sanitized storage', 'Community monitored'],
        coordinates: { lat: 37.7752, lng: -122.4114 },
        openHours: '24 Hours Daily'
      }
    ]
  },
  {
    id: 'civic-center',
    name: 'Tenderloin & Civic Center',
    city: 'San Francisco, CA',
    hexId: 'hex-8828308257',
    centerLat: 37.7825,
    centerLng: -122.4180,
    radiusKm: 0.6,
    safeHandoffHubs: [
      {
        id: 'hub-c1',
        name: 'SF Public Library Main Branch',
        type: 'library',
        address: '100 Larkin St',
        safetyFeatures: ['City security guards', 'Well-lit main atrium', 'Surveillance cameras'],
        coordinates: { lat: 37.7793, lng: -122.4162 },
        openHours: 'Mon-Sun 10am - 6pm'
      },
      {
        id: 'hub-c2',
        name: 'Boeddeker Park Community Hub',
        type: 'civic',
        address: '246 Eddy St',
        safetyFeatures: ['Park patrol present', 'Perimeter lighting', 'Enclosed public courtyard'],
        coordinates: { lat: 37.7844, lng: -122.4132 },
        openHours: '9:00 AM - 7:00 PM'
      }
    ]
  },
  {
    id: 'richmond',
    name: 'Inner & Central Richmond',
    city: 'San Francisco, CA',
    hexId: 'hex-8828308212',
    centerLat: 37.7798,
    centerLng: -122.4690,
    radiusKm: 1.1,
    safeHandoffHubs: [
      {
        id: 'hub-r1',
        name: 'Richmond Public Library Entrance',
        type: 'library',
        address: '351 9th Ave',
        safetyFeatures: ['Safe family neighborhood', 'Well-lit porch', 'Staff during open hours'],
        coordinates: { lat: 37.7818, lng: -122.4674 },
        openHours: 'Mon-Sat 10am - 6pm'
      },
      {
        id: 'hub-r2',
        name: 'Clement St Community Pantry Box',
        type: 'fridge',
        address: '614 Clement St',
        safetyFeatures: ['High commercial foot traffic', 'Bright merchant storefronts'],
        coordinates: { lat: 37.7831, lng: -122.4658 },
        openHours: '24 Hours Daily'
      }
    ]
  },
  {
    id: 'sunset',
    name: 'Sunset District',
    city: 'San Francisco, CA',
    hexId: 'hex-8828308234',
    centerLat: 37.7540,
    centerLng: -122.4850,
    radiusKm: 1.2,
    safeHandoffHubs: [
      {
        id: 'hub-su1',
        name: 'Ortega Branch Library Lobby',
        type: 'library',
        address: '3223 Ortega St',
        safetyFeatures: ['Civic grounds', 'Exterior security lighting', 'Accessible transit stop'],
        coordinates: { lat: 37.7518, lng: -122.4975 },
        openHours: 'Mon-Sat 10am - 6pm'
      }
    ]
  },
  {
    id: 'castro',
    name: 'Castro & Upper Market',
    city: 'San Francisco, CA',
    hexId: 'hex-8828308265',
    centerLat: 37.7609,
    centerLng: -122.4350,
    radiusKm: 0.7,
    safeHandoffHubs: [
      {
        id: 'hub-ca1',
        name: 'Harvey Milk Plaza Transit Area',
        type: 'transit',
        address: 'Castro St & Market St',
        safetyFeatures: ['Muni metro station', 'Continuously lit plaza', 'Active commercial corridor'],
        coordinates: { lat: 37.7626, lng: -122.4353 },
        openHours: '5:30 AM - 12:30 AM'
      },
      {
        id: 'hub-ca2',
        name: 'Eureka Valley Recreation Plaza',
        type: 'civic',
        address: '100 Collingwood St',
        safetyFeatures: ['Public sports grounds', 'Open line of sight', 'Park staff'],
        coordinates: { lat: 37.7592, lng: -122.4367 },
        openHours: '8:00 AM - 9:00 PM'
      }
    ]
  }
];

export function getNeighborhoodById(id: string): Neighborhood {
  return NEIGHBORHOODS.find(n => n.id === id) || NEIGHBORHOODS[0];
}

/**
 * Obfuscate coordinates: snap to neighborhood centroid with small hex jitter (< 250m)
 * ensuring exact donor coordinates are NEVER recorded or broadcast to receivers.
 */
export function obfuscateCoordinates(neighborhoodId: string): { lat: number; lng: number } {
  const neighborhood = getNeighborhoodById(neighborhoodId);
  // deterministic/jittered pseudo-hex center
  const jitterLat = (Math.random() - 0.5) * 0.003;
  const jitterLng = (Math.random() - 0.5) * 0.003;
  return {
    lat: Number((neighborhood.centerLat + jitterLat).toFixed(4)),
    lng: Number((neighborhood.centerLng + jitterLng).toFixed(4)),
  };
}
