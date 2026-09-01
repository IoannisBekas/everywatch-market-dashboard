'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Activity,
  Clock3,
  Database,
  Globe2,
  RotateCcw,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';

import { MarketMap } from '@/components/market-map';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import {
  aggregateBrands,
  aggregateChannels,
  aggregateKpis,
  aggregateLocations,
  aggregateMonthly,
  ALL_FILTER,
  filterMarketRows,
  FilterState,
  loadMarketRows,
  MarketRow,
  uniqueValues,
} from '@/lib/market-data';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const DATA_PATH = `${BASE_PATH}/data/everywatch_synthetic_market_data_300.csv`;
const LOGO_PATH = `${BASE_PATH}/everywatch-official-white-logo.png`;
const VIDEO_PATH = `${BASE_PATH}/everywatch-brand-data-pulse.mp4`;

const INITIAL_FILTERS: FilterState = {
  region: ALL_FILTER,
  brand: ALL_FILTER,
  channel: ALL_FILTER,
  status: ALL_FILTER,
};

const trendConfig = {
  gmv: { label: 'Sold GMV', color: '#d9b766' },
} satisfies ChartConfig;

const channelConfig = {
  sellThrough: { label: 'Sell-through', color: '#d9b766' },
} satisfies ChartConfig;

const brandConfig = {
  gmv: { label: 'Sold GMV', color: '#d9b766' },
} satisfies ChartConfig;

function compactCurrency(value: number) {
  if (value === 0) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: value >= 10_000_000 ? 1 : 2,
  }).format(value);
}

function fullCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function percent(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value);
}

function FilterControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="filter-control">
      <span>{label}</span>
      <NativeSelect
        aria-label={`Filter by ${label}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="filter-select"
      >
        <NativeSelectOption value={ALL_FILTER}>All {label}</NativeSelectOption>
        {options.map((option) => (
          <NativeSelectOption key={option} value={option}>
            {option}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </label>
  );
}

function PanelHeading({
  eyebrow,
  title,
  detail,
}: {
  eyebrow: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="panel-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <span className="panel-detail">{detail}</span>
    </div>
  );
}

export default function Home() {
  const [rows, setRows] = useState<MarketRow[]>([]);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadMarketRows(DATA_PATH)
      .then((marketRows) => {
        if (active) setRows(marketRows);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Market data could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredRows = useMemo(() => filterMarketRows(rows, filters), [filters, rows]);
  const kpis = useMemo(() => aggregateKpis(filteredRows), [filteredRows]);
  const monthly = useMemo(() => aggregateMonthly(filteredRows), [filteredRows]);
  const channelData = useMemo(() => aggregateChannels(filteredRows), [filteredRows]);
  const brandData = useMemo(() => aggregateBrands(filteredRows), [filteredRows]);
  const locations = useMemo(() => aggregateLocations(filteredRows), [filteredRows]);

  const options = useMemo(
    () => ({
      region: uniqueValues(rows, 'Region'),
      brand: uniqueValues(rows, 'Brand'),
      channel: uniqueValues(rows, 'Channel_Type'),
      status: uniqueValues(rows, 'Status'),
    }),
    [rows],
  );

  const activeFilterCount = Object.values(filters).filter((value) => value !== ALL_FILTER).length;
  const leadingMarket = locations[0];
  const topBrand = brandData[0];
  const trendDateRange = monthly.length
    ? `${monthly[0].label}—${monthly[monthly.length - 1].label}`
    : 'No period selected';

  const kpiCards = [
    {
      label: 'Sold GMV',
      value: compactCurrency(kpis.gmv),
      note: `${kpis.sold.toLocaleString()} watches sold`,
      icon: TrendingUp,
    },
    {
      label: 'Listings',
      value: kpis.listings.toLocaleString(),
      note: `${filteredRows.length.toLocaleString()} market records`,
      icon: Database,
    },
    {
      label: 'Sell-through',
      value: percent(kpis.sellThrough),
      note: 'sold share of closed listings',
      icon: Activity,
    },
    {
      label: 'Time to sell',
      value: `${Math.round(kpis.averageDays)} days`,
      note: 'average days on market',
      icon: Clock3,
    },
  ];

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <header className="brand-header">
          <div className="brand-lockup">
            <Image
              src={LOGO_PATH}
              alt="EveryWatch"
              width={2270}
              height={240}
              priority
              className="brand-logo"
            />
            <span className="brand-divider" aria-hidden="true" />
            <div>
              <span className="eyebrow">Industry intelligence</span>
              <h1>Secondary Market Pulse</h1>
            </div>
          </div>
          <div className="dataset-badge">
            <Globe2 aria-hidden="true" />
            <div>
              <span>Global research model</span>
              <strong>300 synthetic records</strong>
            </div>
          </div>
        </header>

        <section className="filter-bar" aria-label="Global dashboard filters">
          <div className="filter-intro">
            <SlidersHorizontal aria-hidden="true" />
            <div>
              <span>Market lens</span>
              <strong>{activeFilterCount ? `${activeFilterCount} active` : 'Global view'}</strong>
            </div>
          </div>
          <FilterControl
            label="Regions"
            value={filters.region}
            options={options.region}
            onChange={(region) => setFilters((current) => ({ ...current, region }))}
          />
          <FilterControl
            label="Brands"
            value={filters.brand}
            options={options.brand}
            onChange={(brand) => setFilters((current) => ({ ...current, brand }))}
          />
          <FilterControl
            label="Channels"
            value={filters.channel}
            options={options.channel}
            onChange={(channel) => setFilters((current) => ({ ...current, channel }))}
          />
          <FilterControl
            label="Status"
            value={filters.status}
            options={options.status}
            onChange={(status) => setFilters((current) => ({ ...current, status }))}
          />
          <button
            type="button"
            className="reset-button"
            onClick={() => setFilters(INITIAL_FILTERS)}
            disabled={activeFilterCount === 0}
          >
            <RotateCcw aria-hidden="true" />
            Reset
          </button>
        </section>

        {error ? <div className="dashboard-alert">{error}</div> : null}
        {loading ? <div className="dashboard-alert">Loading the 300-row market model…</div> : null}

        <section className="kpi-grid" aria-label="Headline market indicators">
          {kpiCards.map(({ label, value, note, icon: Icon }) => (
            <article className="kpi-card" key={label}>
              <div className="kpi-topline">
                <span>{label}</span>
                <Icon aria-hidden="true" />
              </div>
              <strong>{value}</strong>
              <small>{note}</small>
            </article>
          ))}
        </section>

        <section className="hero-grid">
          <article className="panel map-panel">
            <PanelHeading
              eyebrow="Geographic concentration"
              title="Three-dimensional market map"
              detail={`${locations.length} active markets`}
            />
            <div className="map-stage">
              <MarketMap locations={locations} region={filters.region} />
              <div className="map-legend" aria-hidden="true">
                <span className="legend-column" />
                <span>Column height = sold GMV</span>
              </div>
              {leadingMarket ? (
                <div className="map-leader">
                  <span>Leading market</span>
                  <strong>{leadingMarket.city}</strong>
                  <small>{compactCurrency(leadingMarket.gmv)} sold GMV</small>
                </div>
              ) : null}
            </div>
          </article>

          <div className="hero-side">
            <article className="panel trend-panel">
              <PanelHeading
                eyebrow="Monthly close activity"
                title="Sold GMV trajectory"
                detail={trendDateRange}
              />
              <ChartContainer config={trendConfig} className="trend-chart">
                <AreaChart data={monthly} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="rgba(161,177,193,0.14)" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={18}
                    tick={{ fill: '#8e9bad', fontSize: 10 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => compactCurrency(Number(value))}
                    tick={{ fill: '#8e9bad', fontSize: 10 }}
                  />
                  <ChartTooltip
                    cursor={{ stroke: 'rgba(217,183,102,.45)', strokeDasharray: '4 4' }}
                    content={
                      <ChartTooltipContent
                        indicator="line"
                        formatter={(value) => (
                          <div className="tooltip-row">
                            <span>Sold GMV</span>
                            <strong>{fullCurrency(Number(value))}</strong>
                          </div>
                        )}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="gmv"
                    stroke="var(--color-gmv)"
                    strokeWidth={2.5}
                    fill="rgba(217,183,102,0.16)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#f4dfa7', stroke: '#07111d' }}
                  />
                </AreaChart>
              </ChartContainer>
            </article>

            <article className="panel video-panel">
              <div className="video-copy">
                <span className="eyebrow">Higgsfield visual</span>
                <h2>Time, value, provenance.</h2>
                <p>A cinematic brand-data pulse for the global collector economy.</p>
              </div>
              <video
                src={VIDEO_PATH}
                autoPlay
                loop
                muted
                playsInline
                controls
                preload="metadata"
                aria-label="EveryWatch brand-data pulse generated with Higgsfield AI"
              />
            </article>
          </div>
        </section>

        <section className="support-grid">
          <article className="panel support-panel">
            <PanelHeading
              eyebrow="Liquidity signal"
              title="Sell-through by channel"
              detail={channelData[0] ? `${channelData[0].channel} leads` : 'No data'}
            />
            <ChartContainer config={channelConfig} className="support-chart">
              <BarChart
                data={channelData}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 12, bottom: 0 }}
              >
                <CartesianGrid horizontal={false} stroke="rgba(161,177,193,0.12)" />
                <XAxis
                  type="number"
                  domain={[0, 1]}
                  tickFormatter={(value) => percent(Number(value))}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#8e9bad', fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="channel"
                  width={132}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#cbd4dc', fontSize: 11 }}
                />
                <ChartTooltip
                  cursor={{ fill: 'rgba(217,183,102,.06)' }}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value) => (
                        <div className="tooltip-row">
                          <span>Sell-through</span>
                          <strong>{percent(Number(value))}</strong>
                        </div>
                      )}
                    />
                  }
                />
                <Bar dataKey="sellThrough" fill="var(--color-sellThrough)" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ChartContainer>
          </article>

          <article className="panel support-panel">
            <PanelHeading
              eyebrow="Brand concentration"
              title="Sold GMV leaders"
              detail={topBrand ? `${topBrand.brand} ranks first` : 'No data'}
            />
            <ChartContainer config={brandConfig} className="support-chart">
              <BarChart
                data={brandData}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 12, bottom: 0 }}
              >
                <CartesianGrid horizontal={false} stroke="rgba(161,177,193,0.12)" />
                <XAxis
                  type="number"
                  tickFormatter={(value) => compactCurrency(Number(value))}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#8e9bad', fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="brand"
                  width={126}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#cbd4dc', fontSize: 11 }}
                />
                <ChartTooltip
                  cursor={{ fill: 'rgba(217,183,102,.06)' }}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value) => (
                        <div className="tooltip-row">
                          <span>Sold GMV</span>
                          <strong>{fullCurrency(Number(value))}</strong>
                        </div>
                      )}
                    />
                  }
                />
                <Bar dataKey="gmv" fill="var(--color-gmv)" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ChartContainer>
          </article>
        </section>

        <footer className="dashboard-footer">
          <span>EVERYWATCH INDUSTRY STUDY · RESEARCH DEMO</span>
          <p>Synthetic sample data for visualization only. Not investment advice or a live market quotation.</p>
        </footer>
      </div>
    </main>
  );
}
