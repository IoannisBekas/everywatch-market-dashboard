export const ALL_FILTER = 'All';

export type FilterState = {
  region: string;
  brand: string;
  channel: string;
  status: string;
};

export type MarketRow = {
  Year_Month_Date: string;
  Status: string;
  Channel_Type: string;
  Region: string;
  Country: string;
  City: string;
  Brand: string;
  Sold_GMV_USD: number;
  Sold_Flag: number;
  Closed_Flag: number;
  Days_on_Market: number;
  Market_Index_Value: number;
  Units: number;
};

export type MarketLocation = {
  key: string;
  region: string;
  country: string;
  city: string;
  longitude: number;
  latitude: number;
  listings: number;
  gmv: number;
  sold: number;
  closed: number;
  sellThrough: number;
  height: number;
};

type RawRow = Record<string, string>;

const LOCATION_COORDINATES: Record<string, [number, number]> = {
  'Argentina|Buenos Aires': [-58.3816, -34.6037],
  'Australia|Sydney': [151.2093, -33.8688],
  'Brazil|São Paulo': [-46.6333, -23.5505],
  'Canada|Toronto': [-79.3832, 43.6532],
  'France|Paris': [2.3522, 48.8566],
  'Germany|Munich': [11.582, 48.1351],
  'Hong Kong|Hong Kong': [114.1694, 22.3193],
  'Italy|Milan': [9.19, 45.4642],
  'Japan|Tokyo': [139.6503, 35.6762],
  'Mexico|Mexico City': [-99.1332, 19.4326],
  'Monaco|Monaco': [7.4246, 43.7384],
  'Qatar|Doha': [51.531, 25.2854],
  'Saudi Arabia|Riyadh': [46.6753, 24.7136],
  'Singapore|Singapore': [103.8198, 1.3521],
  'South Korea|Seoul': [126.978, 37.5665],
  'Switzerland|Geneva': [6.1432, 46.2044],
  'United Arab Emirates|Dubai': [55.2708, 25.2048],
  'United Kingdom|London': [-0.1278, 51.5074],
  'United States|Los Angeles': [-118.2437, 34.0522],
  'United States|Miami Beach': [-80.13, 25.7907],
  'United States|New York': [-74.006, 40.7128],
};

function parseCsv(text: string): RawRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (character === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...records] = rows;
  if (!headers) return [];

  return records.map((record) =>
    Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ''])),
  );
}

function numberValue(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number(value.replace(/[$,]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function loadMarketRows(assetPath: string): Promise<MarketRow[]> {
  const response = await fetch(assetPath);
  if (!response.ok) throw new Error(`Unable to load market data (${response.status}).`);

  const records = parseCsv(await response.text());
  const marketRows = records.map((record) => ({
    Year_Month_Date: record.Year_Month_Date,
    Status: record.Status,
    Channel_Type: record.Channel_Type,
    Region: record.Region,
    Country: record.Country,
    City: record.City,
    Brand: record.Brand,
    Sold_GMV_USD: numberValue(record.Sold_GMV_USD),
    Sold_Flag: numberValue(record.Sold_Flag),
    Closed_Flag: numberValue(record.Closed_Flag),
    Days_on_Market: numberValue(record.Days_on_Market),
    Market_Index_Value: numberValue(record.Market_Index_Value),
    Units: numberValue(record.Units),
  }));

  const missingLocations = [
    ...new Set(
      marketRows
        .map((row) => `${row.Country}|${row.City}`)
        .filter((key) => !LOCATION_COORDINATES[key]),
    ),
  ];

  if (missingLocations.length > 0) {
    throw new Error(`Missing map coordinates for: ${missingLocations.join(', ')}`);
  }

  return marketRows;
}

export function filterMarketRows(rows: MarketRow[], filters: FilterState) {
  return rows.filter(
    (row) =>
      (filters.region === ALL_FILTER || row.Region === filters.region) &&
      (filters.brand === ALL_FILTER || row.Brand === filters.brand) &&
      (filters.channel === ALL_FILTER || row.Channel_Type === filters.channel) &&
      (filters.status === ALL_FILTER || row.Status === filters.status),
  );
}

export function uniqueValues(rows: MarketRow[], key: keyof MarketRow) {
  return [...new Set(rows.map((row) => String(row[key])).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function aggregateKpis(rows: MarketRow[]) {
  const listings = rows.reduce((sum, row) => sum + row.Units, 0);
  const gmv = rows.reduce((sum, row) => sum + row.Sold_GMV_USD, 0);
  const sold = rows.reduce((sum, row) => sum + row.Sold_Flag, 0);
  const closed = rows.reduce((sum, row) => sum + row.Closed_Flag, 0);
  const averageDays = rows.length
    ? rows.reduce((sum, row) => sum + row.Days_on_Market, 0) / rows.length
    : 0;

  return {
    listings,
    gmv,
    sold,
    sellThrough: closed ? sold / closed : 0,
    averageDays,
  };
}

export function aggregateMonthly(rows: MarketRow[]) {
  const grouped = new Map<string, { gmv: number; indexTotal: number; count: number }>();

  for (const row of rows) {
    const current = grouped.get(row.Year_Month_Date) ?? { gmv: 0, indexTotal: 0, count: 0 };
    current.gmv += row.Sold_GMV_USD;
    current.indexTotal += row.Market_Index_Value;
    current.count += 1;
    grouped.set(row.Year_Month_Date, current);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, values]) => {
      const date = new Date(`${month}T00:00:00Z`);
      return {
        month,
        label: date.toLocaleDateString('en-US', {
          month: 'short',
          year: '2-digit',
          timeZone: 'UTC',
        }),
        gmv: values.gmv,
        marketIndex: values.count ? values.indexTotal / values.count : 0,
      };
    });
}

export function aggregateBrands(rows: MarketRow[]) {
  const grouped = new Map<string, number>();
  for (const row of rows) grouped.set(row.Brand, (grouped.get(row.Brand) ?? 0) + row.Sold_GMV_USD);

  return [...grouped.entries()]
    .map(([brand, gmv]) => ({ brand, gmv }))
    .sort((left, right) => right.gmv - left.gmv)
    .slice(0, 7);
}

export function aggregateChannels(rows: MarketRow[]) {
  const grouped = new Map<string, { gmv: number; sold: number; closed: number }>();
  for (const row of rows) {
    const current = grouped.get(row.Channel_Type) ?? { gmv: 0, sold: 0, closed: 0 };
    current.gmv += row.Sold_GMV_USD;
    current.sold += row.Sold_Flag;
    current.closed += row.Closed_Flag;
    grouped.set(row.Channel_Type, current);
  }

  return [...grouped.entries()]
    .map(([channel, values]) => ({
      channel,
      gmv: values.gmv,
      sellThrough: values.closed ? values.sold / values.closed : 0,
    }))
    .sort((left, right) => right.gmv - left.gmv);
}

export function aggregateLocations(rows: MarketRow[]): MarketLocation[] {
  const grouped = new Map<
    string,
    { region: string; country: string; city: string; listings: number; gmv: number; sold: number; closed: number }
  >();

  for (const row of rows) {
    const key = `${row.Country}|${row.City}`;
    const current = grouped.get(key) ?? {
      region: row.Region,
      country: row.Country,
      city: row.City,
      listings: 0,
      gmv: 0,
      sold: 0,
      closed: 0,
    };
    current.listings += row.Units;
    current.gmv += row.Sold_GMV_USD;
    current.sold += row.Sold_Flag;
    current.closed += row.Closed_Flag;
    grouped.set(key, current);
  }

  const maxGmv = Math.max(1, ...[...grouped.values()].map((value) => value.gmv));

  return [...grouped.entries()]
    .map(([key, values]) => {
      const [longitude, latitude] = LOCATION_COORDINATES[key];
      return {
        key,
        ...values,
        longitude,
        latitude,
        sellThrough: values.closed ? values.sold / values.closed : 0,
        height: Math.round(90000 + Math.sqrt(values.gmv / maxGmv) * 760000),
      };
    })
    .sort((left, right) => right.gmv - left.gmv);
}
