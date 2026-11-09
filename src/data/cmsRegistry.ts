import type { FacilityType, StarRating } from "@/types";

/**
 * Mock CMS provider registry used by the "Add Building" workflow.
 * Fictional records — NOT real CMS data.
 */
export interface CmsRegistryRecord {
  ccn: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  type: FacilityType;
  certifiedBeds: number;
  adc: number;
  operatorName: string;
  ownershipType: string;
  ratings: { overall: StarRating; health: StarRating; staffing: StarRating; qm: StarRating };
  certificationDate: string;
}

export const cmsRegistry: CmsRegistryRecord[] = [
  { ccn: "235702", name: "Willow Bend Nursing & Rehabilitation", street: "2950 Kalamazoo Ave SE", city: "Kentwood", state: "MI", zip: "49508", county: "Kent", type: "skilled_nursing", certifiedBeds: 108, adc: 91, operatorName: "Cedarbrook Health Services", ownershipType: "For profit — LLC", ratings: { overall: 3, health: 3, staffing: 3, qm: 4 }, certificationDate: "1994-08-01" },
  { ccn: "366811", name: "Heritage Oaks Care Center", street: "1415 W Central Ave", city: "Toledo", state: "OH", zip: "43606", county: "Lucas", type: "skilled_nursing", certifiedBeds: 135, adc: 112, operatorName: "Great Lakes Senior Health", ownershipType: "For profit — Corporation", ratings: { overall: 2, health: 2, staffing: 3, qm: 3 }, certificationDate: "1981-03-15" },
  { ccn: "155921", name: "Autumn Ridge Health Campus", street: "4400 Lima Road", city: "Fort Wayne", state: "IN", zip: "46808", county: "Allen", type: "skilled_nursing", certifiedBeds: 96, adc: 84, operatorName: "Hoosier Health Partners", ownershipType: "Government — County", ratings: { overall: 4, health: 4, staffing: 4, qm: 3 }, certificationDate: "2006-11-01" },
  { ccn: "185730", name: "Pine Knob Rehabilitation Center", street: "780 Richmond Road", city: "Lexington", state: "KY", zip: "40502", county: "Fayette", type: "skilled_nursing", certifiedBeds: 120, adc: 99, operatorName: "Commonwealth Care Group", ownershipType: "For profit — LLC", ratings: { overall: 3, health: 2, staffing: 4, qm: 4 }, certificationDate: "1999-02-01" },
  { ccn: "445612", name: "Smoky Mountain Health & Rehab", street: "1200 Dolly Parton Pkwy", city: "Sevierville", state: "TN", zip: "37862", county: "Sevier", type: "skilled_nursing", certifiedBeds: 90, adc: 76, operatorName: "Northpoint Care Group", ownershipType: "For profit — Corporation", ratings: { overall: 4, health: 3, staffing: 4, qm: 5 }, certificationDate: "2002-06-15" },
  { ccn: "686455", name: "Gulf Breeze Post-Acute", street: "3300 S Tamiami Trail", city: "Venice", state: "FL", zip: "34293", county: "Sarasota", type: "skilled_nursing", certifiedBeds: 150, adc: 137, operatorName: "Riverside Rehabilitation Partners", ownershipType: "For profit — LLC", ratings: { overall: 5, health: 4, staffing: 5, qm: 5 }, certificationDate: "2011-01-10" },
  { ccn: "455998", name: "Cypress Creek Nursing Center", street: "9100 Louetta Road", city: "Spring", state: "TX", zip: "77379", county: "Harris", type: "skilled_nursing", certifiedBeds: 124, adc: 88, operatorName: "Lone Star Post-Acute", ownershipType: "For profit — Partnership", ratings: { overall: 2, health: 1, staffing: 2, qm: 4 }, certificationDate: "1996-09-01" },
  { ccn: "395880", name: "Susquehanna Valley Health Center", street: "620 N Front Street", city: "Wormleysburg", state: "PA", zip: "17043", county: "Cumberland", type: "skilled_nursing", certifiedBeds: 160, adc: 141, operatorName: "Pinnacle Post-Acute", ownershipType: "For profit — LLC", ratings: { overall: 4, health: 4, staffing: 3, qm: 4 }, certificationDate: "1988-04-01" },
  { ccn: "035611", name: "Saguaro Springs Rehabilitation", street: "7800 E Shea Blvd", city: "Scottsdale", state: "AZ", zip: "85260", county: "Maricopa", type: "skilled_nursing", certifiedBeds: 112, adc: 101, operatorName: "Sonoran Health Partners", ownershipType: "For profit — Corporation", ratings: { overall: 5, health: 5, staffing: 4, qm: 4 }, certificationDate: "2008-07-01" },
  { ccn: "146733", name: "Illinois River Care Center", street: "300 Main Street", city: "Pekin", state: "IL", zip: "61554", county: "Tazewell", type: "skilled_nursing", certifiedBeds: 82, adc: 64, operatorName: "Heartland Prairie Care", ownershipType: "Non-profit — Church related", ratings: { overall: 3, health: 4, staffing: 2, qm: 3 }, certificationDate: "1975-12-01" },
];
