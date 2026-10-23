import { db } from "@/services/storage/dexieDatabase.js";

export function normalizeSearchValue(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function getMaximumEditDistance(value) {
  if (value.length < 3) return 0;
  return Math.max(1, Math.floor(value.length * 0.2));
}

function getDamerauLevenshteinDistance(first, second) {
  const matrix = Array.from({ length: first.length + 1 }, () =>
    Array(second.length + 1).fill(0),
  );

  for (let row = 0; row <= first.length; row += 1) matrix[row][0] = row;
  for (let column = 0; column <= second.length; column += 1) matrix[0][column] = column;

  for (let row = 1; row <= first.length; row += 1) {
    for (let column = 1; column <= second.length; column += 1) {
      const substitutionCost = first[row - 1] === second[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + substitutionCost,
      );

      if (
        row > 1 &&
        column > 1 &&
        first[row - 1] === second[column - 2] &&
        first[row - 2] === second[column - 1]
      ) {
        matrix[row][column] = Math.min(
          matrix[row][column],
          matrix[row - 2][column - 2] + 1,
        );
      }
    }
  }

  return matrix[first.length][second.length];
}

function matchesSearchWord(searchWord, productWord) {
  if (productWord.includes(searchWord)) return true;

  const maximumDistance = getMaximumEditDistance(searchWord);
  if (Math.abs(searchWord.length - productWord.length) > maximumDistance) return false;

  return getDamerauLevenshteinDistance(searchWord, productWord) <= maximumDistance;
}

function matchesSearchValue(value, normalizedTerm) {
  const normalizedValue = normalizeSearchValue(value);
  if (normalizedValue.includes(normalizedTerm)) return true;

  const searchWords = normalizedTerm.split(/\s+/);
  const productWords = normalizedValue.split(/\s+/);

  return searchWords.every((searchWord) =>
    productWords.some((productWord) => matchesSearchWord(searchWord, productWord)),
  );
}

export function createProductRepository(database = db) {
  async function searchProductsLocal(term) {
    const entry = await database.apiCache.get("/product");
    const products = Array.isArray(entry?.response) ? entry.response : [];
    const normalizedTerm = normalizeSearchValue(term);
    if (!normalizedTerm) return products;

    return products.filter(({ brand, model }) =>
      [brand, model].some((value) => matchesSearchValue(value, normalizedTerm)),
    );
  }

  return { searchProductsLocal };
}

export const productRepository = createProductRepository();
