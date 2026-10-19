// PinIQ · outils communs aux robots : contour de la France, requêtes OpenStreetMap
// © D'jims ANDRÉ · Tous droits réservés
// Contour simplifié de la France métropolitaine et de la Corse (lat, lon)
export const FR = [[51.09,2.54],[50.81,2.95],[50.75,3.3],[50.5,3.7],[50.33,4.15],[49.97,4.15],[50.12,4.85],[49.8,4.9],[49.55,5.47],[49.47,6.37],[49.17,6.75],[49.21,7.37],[49.05,8.2],[48.55,7.8],[47.9,7.58],[47.59,7.59],[47.43,6.95],[47.03,6.7],[46.42,6.1],[46.26,5.98],[46.13,6.2],[46.4,6.55],[46.45,6.8],[46.16,6.86],[45.83,7.03],[45.14,7.13],[44.85,7.0],[44.13,7.71],[43.79,7.53],[43.5,7.1],[43.0,6.1],[43.2,5.0],[43.35,4.3],[43.15,3.4],[42.43,3.2],[42.42,2.5],[42.55,1.75],[42.75,0.6],[42.8,-0.3],[43.05,-1.0],[43.37,-1.8],[44.5,-1.35],[46.2,-1.65],[47.2,-2.6],[47.7,-4.0],[48.0,-4.9],[48.7,-4.85],[48.9,-3.0],[48.7,-1.6],[49.78,-2.0],[49.75,-1.2],[49.4,-1.0],[49.55,0.1],[50.05,1.4],[50.95,1.55]];
export const CORSE = [[43.05,9.35],[42.6,9.6],[41.9,9.45],[41.35,9.25],[41.5,8.75],[42.25,8.5],[42.75,9.15]];
export function dedans(lat, lon, poly){ let ok = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++){ const [ai, bi] = poly[i], [aj, bj] = poly[j]; if ((bi > lon) !== (bj > lon) && lat < (aj - ai) * (lon - bi) / (bj - bi) + ai) ok = !ok; } return ok; }
export const ETRANGER = /\.(de|ch|it|es|be|nl|lu|at|uk|cat|ad|pt|ie)$/i;
export const enFranceLL = (lat, lon) => dedans(lat, lon, FR) || dedans(lat, lon, CORSE);
export const enFrance = g => enFranceLL(g.ll[0], g.ll[1]) && !(g.site && ETRANGER.test(new URL(g.site).host));

