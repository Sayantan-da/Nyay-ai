import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput
} from "react-native";
import { useTheme } from "../theme/ThemeContext";
import Icon from "../components/Icon";
import Badge from "../components/Badge";

const LEGAL_CATEGORIES = [
  "All",
  "Consumer",
  "Tenancy",
  "Cybercrime",
  "Workplace",
  "Women's Safety",
  "Legal Aid"
];

const RIGHTS_DATABASE = [
  {
    id: "cyber-fraud",
    category: "Cybercrime",
    title: "Unauthorized Digital & UPI Transaction Fraud",
    statute: "IT Act 2000 & BNS 2023",
    icon: "shield",
    helpline: "1930",
    portal: "cybercrime.gov.in",
    summary: "Immediate statutory safeguards and liability limits for fraudulent bank, credit card, and UPI transactions.",
    keyPoints: [
      "Zero customer liability if unauthorized transaction reported to bank within 3 working days (RBI Circular).",
      "National Cyber Helpline 1930 can trigger inter-bank account freeze if called within the 'golden hour'.",
      "Digital chats, UPI payment receipts, and SMS debit alerts are admissible in court under BSA 2023."
    ]
  },
  {
    id: "rental-deposit",
    category: "Tenancy",
    title: "Security Deposit Refund & Arbitrary Deductions",
    statute: "Model Tenancy Act & Indian Contract Act, 1872",
    icon: "document",
    helpline: "Rent Authority / Civil Court",
    portal: "e-Courts Services",
    summary: "Clear rules governing security deposit refund timelines, fair wear and tear, and eviction notice periods.",
    keyPoints: [
      "Refundable security deposits must be returned within the agreed timeline (standard 7–14 days) minus verified repair bills.",
      "Landlord cannot withhold deposits for normal wear and tear or aging of premises.",
      "Unilateral disconnection of electricity or water supply by landlord is an offense under tenancy law."
    ]
  },
  {
    id: "consumer-ecommerce",
    category: "Consumer",
    title: "Defective Products, Misleading Ads & E-Commerce Returns",
    statute: "Consumer Protection Act, 2019",
    icon: "rights",
    helpline: "1915",
    portal: "edaakhil.nic.in",
    summary: "Statutory rights against counterfeit goods, refused replacements, and dark patterns on online platforms.",
    keyPoints: [
      "E-commerce marketplaces share product liability with merchants for counterfeit or hazardous goods.",
      "Right to full refund if seller delivers damaged or materially different merchandise.",
      "Consumer complaints can be filed entirely online via e-Daakhil without hiring an advocate."
    ]
  },
  {
    id: "posh-workplace",
    category: "Workplace",
    title: "Workplace Harassment & Internal Committee Rights",
    statute: "POSH Act, 2013",
    icon: "user",
    helpline: "181 / 112",
    portal: "shebox.nic.in",
    summary: "Mandatory mechanisms for prevention, grievance reporting, and interim protection at workplaces.",
    keyPoints: [
      "Any organization with 10+ employees must maintain a functional Internal Committee (IC) with a women presiding officer.",
      "Complainants are legally entitled to request interim relief: up to 3 months paid leave or department transfer.",
      "Strict confidentiality of identity and inquiry proceedings is mandated under Section 16 of the Act."
    ]
  },
  {
    id: "zero-fir",
    category: "Women's Safety",
    title: "Zero FIR Registration & Detention Safeguards",
    statute: "BNSS 2023 & BNS 2023",
    icon: "shield",
    helpline: "112",
    portal: "State Police Citizen Portals",
    summary: "Universal right to report cognizable offenses regardless of territorial police jurisdiction.",
    keyPoints: [
      "Section 173 BNSS: Any police station is legally required to register a Zero FIR and forward it to the jurisdictional station.",
      "Women cannot be summoned to police stations for examination between sunset and sunrise (Section 179 BNSS).",
      "Immediate right to have a nominated friend, relative, or advocate notified upon arrest under Section 35 BNSS."
    ]
  },
  {
    id: "nalsa-legal-aid",
    category: "Legal Aid",
    title: "Free Legal Aid & Lok Adalat Settlements",
    statute: "Legal Services Authorities Act, 1987",
    icon: "rights",
    helpline: "15100",
    portal: "nalsa.gov.in",
    summary: "Constitutionally guaranteed free legal assistance for citizens with low income, women, and marginalized groups.",
    keyPoints: [
      "Article 39A: Free legal aid provided by NALSA, State Legal Services, and District Legal Services Authorities.",
      "Eligible citizens receive designated legal representation and court fee waivers for civil and criminal cases.",
      "Lok Adalat allows speedier, non-appealable settlement of compoundable disputes without court fees."
    ]
  }
];

export default function LearningHubScreen({ navigation }) {
  const { theme, radii } = useTheme();

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState("cyber-fraud");

  const filteredRights = RIGHTS_DATABASE.filter((item) => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchesQuery =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.statute.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Legal Rights Library</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Searchable statutory provisions, citizen safeguards, and official portals under Indian law.
        </Text>
      </View>

      {/* 2. Search Input */}
      <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.inputBorder, borderRadius: radii.md }]}>
        <Icon name="search" size={16} color={theme.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: theme.textPrimary }]}
          placeholder="Search by topic, statute, or issue (e.g. deposit, POSH)..."
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Icon name="close" size={14} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* 3. Category Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        {LEGAL_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                isSelected
                  ? { backgroundColor: theme.primary, borderColor: theme.primary }
                  : { backgroundColor: theme.surface, borderColor: theme.border },
                { borderRadius: radii.full }
              ]}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.categoryText,
                  { color: isSelected ? "#FFFFFF" : theme.textSecondary, fontWeight: isSelected ? "700" : "500" }
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 4. Categorized Rights List */}
      <View style={styles.listContainer}>
        {filteredRights.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radii.md }]}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No matching legal topics found.</Text>
            <TouchableOpacity onPress={() => { setSelectedCategory("All"); setSearchQuery(""); }}>
              <Text style={[styles.clearFilterText, { color: theme.primary }]}>Reset filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredRights.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <View
                key={item.id}
                style={[
                  styles.itemCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: isExpanded ? theme.primaryBorder : theme.border,
                    borderRadius: radii.lg
                  }
                ]}
              >
                {/* Clickable Card Header */}
                <TouchableOpacity
                  style={styles.cardHeaderRow}
                  onPress={() => setExpandedId(isExpanded ? null : item.id)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.itemIconBox, { backgroundColor: theme.primaryBg }]}>
                    <Icon name={item.icon} size={18} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <View style={styles.titleBadgeRow}>
                      <Badge label={item.category} variant="primary" size="sm" />
                      <Text style={[styles.statuteText, { color: theme.accent }]}>{item.statute}</Text>
                    </View>
                    <Text style={[styles.itemTitle, { color: theme.textPrimary }]}>{item.title}</Text>
                  </View>
                  <Icon
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={14}
                    color={theme.textMuted}
                  />
                </TouchableOpacity>

                {/* Summary Always Visible */}
                <Text style={[styles.itemSummary, { color: theme.textSecondary }]}>{item.summary}</Text>

                {/* Expanded Details: Official Helpline + Key Rights */}
                {isExpanded && (
                  <View style={[styles.expandedContent, { borderTopColor: theme.divider }]}>
                    {/* Official Helpline and Portal Strip */}
                    <View style={[styles.helplineRow, { backgroundColor: theme.surfaceSecondary, borderRadius: radii.sm }]}>
                      <View style={styles.helplineItem}>
                        <Text style={[styles.metaLabel, { color: theme.textMuted }]}>HELPLINE</Text>
                        <Text style={[styles.metaVal, { color: theme.primary }]}>{item.helpline}</Text>
                      </View>
                      <View style={styles.helplineItem}>
                        <Text style={[styles.metaLabel, { color: theme.textMuted }]}>OFFICIAL PORTAL</Text>
                        <Text style={[styles.metaVal, { color: theme.textPrimary }]}>{item.portal}</Text>
                      </View>
                    </View>

                    {/* Key Statutory Safeguards */}
                    <Text style={[styles.safeguardsHeading, { color: theme.textPrimary }]}>
                      Key Rights & Procedural Safeguards:
                    </Text>
                    {item.keyPoints.map((point, idx) => (
                      <View key={idx} style={styles.pointRow}>
                        <View style={[styles.pointBullet, { backgroundColor: theme.successBg }]}>
                          <Icon name="check" size={9} color={theme.success} strokeWidth={2.5} />
                        </View>
                        <Text style={[styles.pointText, { color: theme.textSecondary }]}>{point}</Text>
                      </View>
                    ))}

                    {/* Consult AI on this topic */}
                    <TouchableOpacity
                      style={[styles.consultTopicBtn, { backgroundColor: theme.primaryBg, borderRadius: radii.sm }]}
                      onPress={() => navigation.navigate("Chat", { initialQuery: `Explain my rights regarding ${item.title} under ${item.statute}` })}
                    >
                      <Text style={[styles.consultTopicText, { color: theme.primary }]}>
                        Ask Nyaya AI about {item.category} →
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36
  },
  header: {
    marginBottom: 16
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
    marginBottom: 4
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    gap: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 13
  },
  categoryScroll: {
    flexDirection: "row",
    marginBottom: 16
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    marginRight: 8
  },
  categoryText: {
    fontSize: 11
  },
  listContainer: {
    gap: 12
  },
  emptyCard: {
    padding: 24,
    borderWidth: 1,
    alignItems: "center"
  },
  emptyText: {
    fontSize: 13,
    marginBottom: 8
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: "600"
  },
  itemCard: {
    padding: 14,
    borderWidth: 1
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6
  },
  itemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10
  },
  titleBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2
  },
  statuteText: {
    fontSize: 10,
    fontWeight: "600"
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2
  },
  itemSummary: {
    fontSize: 12,
    lineHeight: 18
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1
  },
  helplineRow: {
    flexDirection: "row",
    padding: 10,
    marginBottom: 12,
    gap: 12
  },
  helplineItem: {
    flex: 1
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 2
  },
  metaVal: {
    fontSize: 12,
    fontWeight: "600"
  },
  safeguardsHeading: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 8
  },
  pointBullet: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2
  },
  pointText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17
  },
  consultTopicBtn: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: "center",
    marginTop: 8
  },
  consultTopicText: {
    fontSize: 12,
    fontWeight: "600"
  }
});
