import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ReportData } from "./data";
import { TASK_CATEGORY_LABELS } from "@/lib/constants";
import { formatPosition, formatMinutes } from "@/lib/utils";

/**
 * Branded PDF report document (react-pdf).
 * Includes: cover, period, KPIs, ranking summary, work, commentary, methodology.
 * Page numbers + header/footer on every page. Consistent spacing, no cut-offs.
 */

const styles = StyleSheet.create({
  page: { fontSize: 10, padding: 40, fontFamily: "Helvetica", color: "#0f172a", lineHeight: 1.5 },
  cover: { justifyContent: "center", alignItems: "center", textAlign: "center" },
  h1: { fontSize: 22, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  h2: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 8, marginTop: 16, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingBottom: 4 },
  h3: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 4, marginTop: 8 },
  muted: { color: "#64748b", fontSize: 9 },
  brand: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#2563eb", marginBottom: 2 },
  row: { flexDirection: "row", gap: 12 },
  kpiCard: { flex: 1, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 6, padding: 10 },
  kpiValue: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  table: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4, overflow: "hidden" },
  tableHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", fontFamily: "Helvetica-Bold", fontSize: 9 },
  tableRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#e2e8f0", fontSize: 9 },
  cell: { padding: 6 },
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 6 },
  header: { position: "absolute", top: 20, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between" },
  bullet: { marginBottom: 3 },
  badge: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#2563eb" },
});

function Header({ title }: { title: string }) {
  return (
    <View style={styles.header} fixed>
      <Text style={styles.brand}>MarketinCrew</Text>
      <Text style={styles.muted}>{title}</Text>
    </View>
  );
}

function Footer({ page }: { page: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.muted}>Confidential — MarketinCrew SEO Command Center</Text>
      <Text style={styles.muted}>Page {page}</Text>
    </View>
  );
}

export function ReportPdfDocument({ data, title, footer }: { data: ReportData; title: string; footer?: string }) {
  const client = data.client!;
  const gsc = data.gsc;
  const ga = data.analytics;

  return (
    <Document title={title} author="MarketinCrew">
      {/* Cover */}
      <Page size="A4" style={[styles.page, styles.cover]}>
        <Text style={styles.brand}>MARKETINCREW</Text>
        <Text style={{ fontSize: 11, color: "#64748b", marginBottom: 40 }}>SEO Command Center</Text>
        <Text style={styles.h1}>{client.name}</Text>
        <Text style={{ fontSize: 16, marginBottom: 30 }}>{title}</Text>
        <Text style={{ fontSize: 12, color: "#64748b" }}>{data.periodLabel}</Text>
        <Text style={[styles.muted, { marginTop: 60 }]}>Prepared by MarketinCrew · {new Date().toLocaleDateString()}</Text>
      </Page>

      {/* KPIs + Summary */}
      <Page size="A4" style={styles.page}>
        <Header title={title} />
        <Text style={styles.h2}>Reporting Period</Text>
        <Text>{data.periodLabel}</Text>
        <Text style={styles.muted}>Comparing against: {data.previousPeriodLabel}</Text>

        <Text style={styles.h2}>Executive Summary</Text>
        <Text>{data.executiveSummary || "No executive summary provided."}</Text>

        <Text style={styles.h2}>Key SEO KPIs</Text>
        <View style={styles.row}>
          <View style={styles.kpiCard}>
            <Text style={styles.muted}>Organic Clicks</Text>
            <Text style={styles.kpiValue}>{gsc.current.clicks.toLocaleString()}</Text>
            <Delta prev={gsc.previous.clicks} cur={gsc.current.clicks} />
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.muted}>Impressions</Text>
            <Text style={styles.kpiValue}>{gsc.current.impressions.toLocaleString()}</Text>
            <Delta prev={gsc.previous.impressions} cur={gsc.current.impressions} />
          </View>
        </View>
        <View style={[styles.row, { marginTop: 10 }]}>
          <View style={styles.kpiCard}>
            <Text style={styles.muted}>Organic Sessions</Text>
            <Text style={styles.kpiValue}>{ga.current.sessions.toLocaleString()}</Text>
            <Delta prev={ga.previous.sessions} cur={ga.current.sessions} />
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.muted}>Conversions</Text>
            <Text style={styles.kpiValue}>{ga.current.conversions.toLocaleString()}</Text>
            <Delta prev={ga.previous.conversions} cur={ga.current.conversions} />
          </View>
        </View>
        <Text style={[styles.muted, { marginTop: 6 }]}>Source: Google Search Console &amp; Google Analytics 4</Text>
        <Footer page="2" />
      </Page>

      {/* Rankings */}
      <Page size="A4" style={styles.page}>
        <Header title={title} />
        <Text style={styles.h2}>Keyword Ranking Summary</Text>
        <View style={styles.row}>
          {[
            ["Tracked", data.ranking.totals.tracked],
            ["Top 3", data.ranking.totals.top3],
            ["Top 10", data.ranking.totals.top10],
            ["Top 20", data.ranking.totals.top20],
            ["Avg Pos", data.ranking.totals.avgPosition ?? "—"],
          ].map(([l, v]) => (
            <View key={String(l)} style={styles.kpiCard}>
              <Text style={styles.muted}>{l}</Text>
              <Text style={styles.kpiValue}>{String(v)}</Text>
            </View>
          ))}
        </View>
        <Text style={[styles.muted, { marginTop: 6 }]}>Improved: {data.ranking.totals.improved} · Declined: {data.ranking.totals.declined} · Unchanged: {data.ranking.totals.unchanged}</Text>

        {data.ranking.winners.length > 0 && (
          <>
            <Text style={styles.h3}>Top Improvements</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.cell, { flex: 3 }]}>Keyword</Text>
                <Text style={[styles.cell, { flex: 1, textAlign: "center" }]}>Current</Text>
                <Text style={[styles.cell, { flex: 1, textAlign: "center" }]}>Previous</Text>
                <Text style={[styles.cell, { flex: 1, textAlign: "center" }]}>Change</Text>
              </View>
              {data.ranking.winners.slice(0, 10).map((k) => (
                <View key={k.keywordId} style={styles.tableRow} wrap={false}>
                  <Text style={[styles.cell, { flex: 3 }]}>{k.keyword}</Text>
                  <Text style={[styles.cell, { flex: 1, textAlign: "center" }]}>{formatPosition(k.currentPos)}</Text>
                  <Text style={[styles.cell, { flex: 1, textAlign: "center" }]}>{k.previousPos != null ? formatPosition(k.previousPos) : "—"}</Text>
                  <Text style={[styles.cell, { flex: 1, textAlign: "center", color: "#16a34a" }]}>▲ {k.change}</Text>
                </View>
              ))}
            </View>
          </>
        )}
        <Footer page="3" />
      </Page>

      {/* Work + Backlinks + Technical */}
      <Page size="A4" style={styles.page}>
        <Header title={title} />
        <Text style={styles.h2}>Tasks Completed ({data.completedTasks.length})</Text>
        {data.completedTasks.length === 0 ? (
          <Text style={styles.muted}>No tasks were completed during this period.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.cell, { flex: 3 }]}>Task</Text>
              <Text style={[styles.cell, { flex: 2 }]}>Category</Text>
              <Text style={[styles.cell, { flex: 2 }]}>Assignee</Text>
            </View>
            {data.completedTasks.map((t) => (
              <View key={t.id} style={styles.tableRow} wrap={false}>
                <Text style={[styles.cell, { flex: 3 }]}>{t.title}</Text>
                <Text style={[styles.cell, { flex: 2 }]}>{TASK_CATEGORY_LABELS[t.category as keyof typeof TASK_CATEGORY_LABELS] ?? t.category}</Text>
                <Text style={[styles.cell, { flex: 2 }]}>{t.assignee?.name ?? "—"}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.h2}>Work by Category</Text>
        {data.workByCategory.length === 0 ? (
          <Text style={styles.muted}>No approved work logged in this period.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.cell, { flex: 3 }]}>Category</Text>
              <Text style={[styles.cell, { flex: 1, textAlign: "right" }]}>Activities</Text>
              <Text style={[styles.cell, { flex: 1, textAlign: "right" }]}>Time</Text>
            </View>
            {data.workByCategory.map((w) => (
              <View key={w.category} style={styles.tableRow} wrap={false}>
                <Text style={[styles.cell, { flex: 3 }]}>{TASK_CATEGORY_LABELS[w.category as keyof typeof TASK_CATEGORY_LABELS] ?? w.category}</Text>
                <Text style={[styles.cell, { flex: 1, textAlign: "right" }]}>{w.count}</Text>
                <Text style={[styles.cell, { flex: 1, textAlign: "right" }]}>{formatMinutes(w.minutes)}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.h2}>Backlinks & Technical</Text>
        <View style={styles.row}>
          <View style={styles.kpiCard}><Text style={styles.muted}>Live Backlinks</Text><Text style={styles.kpiValue}>{data.backlinks.live}</Text></View>
          <View style={styles.kpiCard}><Text style={styles.muted}>New (period)</Text><Text style={styles.kpiValue}>{data.backlinks.newThisPeriod.length}</Text></View>
          <View style={styles.kpiCard}><Text style={styles.muted}>Open Issues</Text><Text style={styles.kpiValue}>{data.technical.open}</Text></View>
        </View>
        <Footer page="4" />
      </Page>

      {/* Commentary + Methodology */}
      <Page size="A4" style={styles.page}>
        <Header title={title} />
        {data.keyWins && (<><Text style={styles.h2}>Key Wins</Text><Text>{data.keyWins}</Text></>)}
        {data.issuesRisks && (<><Text style={styles.h2}>Issues & Risks</Text><Text>{data.issuesRisks}</Text></>)}
        {data.recommendations && (<><Text style={styles.h2}>Recommendations</Text><Text>{data.recommendations}</Text></>)}
        {data.nextMonthPlan && (<><Text style={styles.h2}>Next Month&apos;s Plan</Text><Text>{data.nextMonthPlan}</Text></>)}

        <Text style={styles.h2}>Methodology & Data Sources</Text>
        <Text style={styles.bullet}>• Organic clicks, impressions, CTR, average position: Google Search Console.</Text>
        <Text style={styles.bullet}>• Organic sessions, users, conversions: Google Analytics 4.</Text>
        <Text style={styles.bullet}>• Keyword positions: exact SERP rank tracking (separate from Search Console average position).</Text>
        <Text style={styles.bullet}>• Work completed: only approved daily work logs and completed tasks within {data.periodLabel}.</Text>
        <Text style={styles.bullet}>• Ranking change = previous − current (positive = improvement). Position 101 = Not in top 100.</Text>

        {footer && <Text style={[styles.muted, { marginTop: 30 }]}>{footer}</Text>}
        <Footer page="5" />
      </Page>
    </Document>
  );
}

function Delta({ prev, cur }: { prev: number; cur: number }) {
  const pct = prev !== 0 ? ((cur - prev) / Math.abs(prev)) * 100 : 0;
  const positive = cur >= prev;
  return (
    <Text style={{ fontSize: 9, color: positive ? "#16a34a" : "#dc2626", marginTop: 2 }}>
      {positive ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}% vs previous
    </Text>
  );
}
