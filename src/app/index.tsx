import { router } from "expo-router";
import { useEffect } from "react";
import {
  BackHandler,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

const RED = "#D71920";
const DARK_RED = "#A90F15";
const YELLOW = "#FFD400";
const BLACK = "#111111";
const WHITE = "#FFFFFF";
const LIGHT = "#F7F7F7";
const TEXT_MUTED = "#6B7280";
const BORDER = "#ECECEC";

export default function Home() {
  const { width } = useWindowDimensions();

  /* =====================================================
     RESPONSIVE SETTINGS
  ===================================================== */

  const isSmall = width < 380;
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;

  const pageWidth = isDesktop ? 980 : isTablet ? 760 : width;

  const sidePadding = isDesktop ? 28 : isTablet ? 28 : isSmall ? 16 : 20;

  const contentWidth = Math.min(
    pageWidth - sidePadding * 2,
    isDesktop ? 924 : isTablet ? 704 : width - sidePadding * 2,
  );

  const heroHeight = isDesktop ? 440 : isTablet ? 390 : isSmall ? 270 : 320;

  const galleryWidth = Math.min(
    contentWidth,
    isDesktop ? 700 : isTablet ? 620 : contentWidth,
  );

  const galleryHeight = isDesktop ? 430 : isTablet ? 390 : isSmall ? 350 : 380;

  /* =====================================================
     ANDROID BACK BUTTON

     Home/root page:
     → Stay on Home
     → No navigation
     → No logout
  ===================================================== */

  useEffect(() => {
    const handleBackPress = () => {
      console.log("📱 Android Back pressed on index.tsx");
      console.log("🚫 No action - already on Home");

      return true;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackPress,
    );

    console.log("📱 index.tsx BackHandler ENABLED");

    return () => {
      subscription.remove();

      console.log("📱 index.tsx BackHandler DISABLED");
    };
  }, []);

  /* =====================================================
     VOTER DATA
  ===================================================== */

  const voterStats = [
    {
      title: "ஆண்",
      value: "2,49,683",
      icon: "♂",
      type: "male",
    },
    {
      title: "பெண்",
      value: "2,37,312",
      icon: "♀",
      type: "female",
    },
    {
      title: "மற்ற பாலினம்",
      value: "129",
      icon: "⚧",
      type: "other",
    },
  ];

  /* =====================================================
     GALLERY

     Add approved local images here later.
  ===================================================== */

  const galleryImages = [require("./images/Sureshkumar.png")];

  /* =====================================================
     GO TO LOGIN

     IMPORTANT:
     This keeps the original app flow.

     Home
       ↓
     Login
       ↓
     Ward Selection
       ↓
     Ward Home
  ===================================================== */

  const goToLogin = () => {
    console.log("➡️ Going to Login");

    router.push("/login");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={RED} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}>
        {/* =====================================================
            PAGE WRAPPER
        ===================================================== */}

        <View
          style={[
            styles.pageWrapper,
            {
              width: pageWidth,
              alignSelf: "center",
            },
          ]}>
          {/* =====================================================
              HEADER
          ===================================================== */}

          <View
            style={[
              styles.header,
              {
                paddingHorizontal: sidePadding,
              },
            ]}>
            <View style={styles.headerBrand}>
              <View style={styles.brandMark}>
                <View style={styles.brandRedBlock} />

                <View style={styles.brandYellowBlock} />
              </View>

              <View style={styles.brandTextWrapper}>
                <Text style={styles.brandSmall}>மக்கள் சேவை</Text>

                <Text
                  style={[styles.brandTitle, isSmall && styles.brandTitleSmall]}
                  numberOfLines={1}
                  adjustsFontSizeToFit>
                  TIRUPPUR SMART CITY
                </Text>
              </View>
            </View>

            {/* HEADER MENU */}

            <Pressable
              style={({ pressed }) => [
                styles.menuButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={goToLogin}>
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
            </Pressable>
          </View>

          {/* =====================================================
              HERO
          ===================================================== */}

          <View style={styles.heroSection}>
            <View style={styles.heroTopAccent} />

            <View
              style={[
                styles.heroImageWrapper,
                {
                  height: heroHeight,
                },
              ]}>
              <Image
                source={require("./images/smartcity.png")}
                style={styles.heroImage}
                resizeMode="cover"
              />

              <View style={styles.imageOverlay} />

              <View
                style={[styles.heroBadge, isSmall && styles.heroBadgeSmall]}>
                <View style={styles.badgeDot} />

                <Text
                  style={styles.heroBadgeText}
                  numberOfLines={1}
                  adjustsFontSizeToFit>
                  TIRUPPUR SMART CITY
                </Text>
              </View>
            </View>

            {/* HERO CONTENT */}

            <View
              style={[
                styles.heroContent,
                {
                  paddingHorizontal: sidePadding,
                },
              ]}>
              <Text style={styles.heroSmallTitle}>
                நமது நகரம் • நமது மக்கள் • நமது சேவை
              </Text>

              <Text
                style={[styles.heroTitle, isSmall && styles.heroTitleSmall]}>
                திருப்பூர்
              </Text>

              <Text
                style={[
                  styles.heroTitleHighlight,
                  isSmall && styles.heroTitleHighlightSmall,
                ]}>
                Smart City
              </Text>

              <Text style={styles.heroDescription}>
                மக்களின் குரலைக் கேட்டு, மக்கள் தேவைகளை அறிந்து, மக்கள்
                சேவைக்காக ஒன்றிணைவோம்.
              </Text>

              {/* MAIN LOGIN CTA */}

              <Pressable
                style={({ pressed }) => [
                  styles.heroButton,
                  {
                    maxWidth: isDesktop ? 420 : 520,
                  },
                  pressed && styles.buttonPressed,
                ]}
                onPress={goToLogin}>
                <Text style={styles.heroButtonText}>எங்களுடன் இணையுங்கள்</Text>

                <Text style={styles.heroButtonArrow}>→</Text>
              </Pressable>
            </View>
          </View>

          {/* =====================================================
              VOTER STATISTICS
          ===================================================== */}

          <View
            style={[
              styles.section,
              {
                paddingHorizontal: sidePadding,
              },
            ]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeadingBlock}>
                <Text style={styles.sectionEyebrow}>மக்கள் விவரம்</Text>

                <Text
                  style={[
                    styles.sectionTitle,
                    isSmall && styles.sectionTitleSmall,
                  ]}>
                  வாக்காளர் விவரங்கள்
                </Text>
              </View>

              <View style={styles.sectionAccent}>
                <View style={styles.sectionAccentRed} />

                <View style={styles.sectionAccentYellow} />
              </View>
            </View>

            {/* TOTAL VOTERS */}

            <View
              style={[
                styles.totalVoterCard,
                {
                  maxWidth: contentWidth,
                  alignSelf: "center",
                },
              ]}>
              <View style={styles.totalIcon}>
                <Text style={styles.totalIconText}>👥</Text>
              </View>

              <View style={styles.totalVoterContent}>
                <Text style={styles.totalVoterLabel}>மொத்த வாக்காளர்கள்</Text>

                <Text
                  style={[
                    styles.totalVoterValue,
                    isSmall && styles.totalVoterValueSmall,
                  ]}>
                  4,87,124
                </Text>

                <Text style={styles.totalVoterSub}>Tiruppur Smart City</Text>
              </View>

              <View style={styles.totalArrow}>
                <Text style={styles.totalArrowText}>→</Text>
              </View>
            </View>

            {/* GENDER GRID */}

            <View
              style={[
                styles.statsGrid,
                {
                  maxWidth: contentWidth,
                  alignSelf: "center",
                },
              ]}>
              {voterStats.map((item) => (
                <View
                  key={item.type}
                  style={[
                    styles.statCard,
                    {
                      width: isSmall ? "100%" : isTablet ? "31.8%" : "31.5%",
                    },
                    isSmall && styles.statCardSmall,
                  ]}>
                  <View
                    style={[
                      styles.statIcon,
                      item.type === "male" && styles.maleIcon,
                      item.type === "female" && styles.femaleIcon,
                      item.type === "other" && styles.otherIcon,
                    ]}>
                    <Text style={styles.statIconText}>{item.icon}</Text>
                  </View>

                  <Text
                    style={styles.statLabel}
                    numberOfLines={2}
                    adjustsFontSizeToFit>
                    {item.title}
                  </Text>

                  <Text style={styles.statValue}>{item.value}</Text>
                </View>
              ))}
            </View>

            <View style={styles.statsNote}>
              <View style={styles.noteDot} />

              <Text style={styles.statsNoteText}>வாக்காளர் விவரங்கள்</Text>
            </View>
          </View>

          {/* =====================================================
              SSS SURESHKUMAR
          ===================================================== */}

          <View
            style={[
              styles.profileSection,
              {
                width: contentWidth,
                alignSelf: "center",
              },
            ]}>
            <View
              style={[
                styles.profileImageContainer,
                {
                  height: isDesktop
                    ? 400
                    : isTablet
                      ? 350
                      : isSmall
                        ? 230
                        : 285,
                },
              ]}>
              <Image
                source={require("./images/smartcity2.png")}
                style={styles.profileImage}
                resizeMode="cover"
              />

              <View style={styles.profileImageAccent} />
            </View>

            <View style={styles.profileContent}>
              <Text style={styles.profileEyebrow}>மக்கள் சேவைக்காக</Text>

              <Text
                style={[
                  styles.profileName,
                  isSmall && styles.profileNameSmall,
                ]}>
                SSS SureshKumar
              </Text>

              <Text style={styles.profileDescription}>
                திருப்பூர் மக்களின் பிரச்சனைகள், தேவைகள் மற்றும்
                எதிர்பார்ப்புகளை அறிந்து மக்களுடன் இணைந்து செயல்படுவதற்கான ஒரு
                தளம்.
              </Text>

              <View style={styles.profileLine}>
                <View style={styles.profileLineRed} />

                <View style={styles.profileLineYellow} />
              </View>
            </View>
          </View>

          {/* =====================================================
              PHOTO GALLERY
          ===================================================== */}

          <View
            style={[
              styles.section,
              {
                paddingHorizontal: sidePadding,
              },
            ]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeadingBlock}>
                <Text style={styles.sectionEyebrow}>புகைப்படங்கள்</Text>

                <Text
                  style={[
                    styles.sectionTitle,
                    isSmall && styles.sectionTitleSmall,
                  ]}>
                  மக்கள் சேவை தருணங்கள்
                </Text>
              </View>

              <View style={styles.cameraCircle}>
                <Text style={styles.cameraIcon}>📸</Text>
              </View>
            </View>

            {/* ONE IMAGE PER SWIPE */}

            <View
              style={[
                styles.galleryViewport,
                {
                  width: galleryWidth,
                  height: galleryHeight,
                  alignSelf: "center",
                },
              ]}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={galleryWidth}
                snapToAlignment="start"
                disableIntervalMomentum={true}
                contentContainerStyle={styles.galleryScroll}>
                {/* PHOTOS */}

                {galleryImages.map((image, index) => (
                  <View
                    key={index}
                    style={[
                      styles.gallerySlide,
                      {
                        width: galleryWidth,
                        height: galleryHeight,
                      },
                    ]}>
                    <View style={styles.galleryCard}>
                      <Image
                        source={image}
                        style={styles.galleryImage}
                        resizeMode="cover"
                      />

                      <View style={styles.galleryOverlay}>
                        <View style={styles.galleryOverlayContent}>
                          <Text style={styles.galleryOverlayText}>
                            SSS SureshKumar
                          </Text>

                          <Text style={styles.galleryOverlaySub}>
                            மக்கள் சேவை
                          </Text>
                        </View>

                        <View style={styles.galleryCounter}>
                          <Text style={styles.galleryCounterText}>
                            {index + 1}/{galleryImages.length}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}

                {/* MORE PHOTOS */}

                <View
                  style={[
                    styles.gallerySlide,
                    {
                      width: galleryWidth,
                      height: galleryHeight,
                    },
                  ]}>
                  <View style={styles.morePhotosCard}>
                    <View style={styles.morePhotosIcon}>
                      <Text style={styles.morePhotosIconText}>+</Text>
                    </View>

                    <Text style={styles.morePhotosTitle}>மேலும்</Text>

                    <Text style={styles.morePhotosSubtitle}>புகைப்படங்கள்</Text>

                    <Text style={styles.swipeHint}>← Swipe →</Text>
                  </View>
                </View>
              </ScrollView>
            </View>

            {/* SWIPE HINT */}

            <View style={styles.carouselHint}>
              <View style={styles.carouselDotActive} />

              <View style={styles.carouselDot} />

              <Text style={styles.carouselHintText}>
                இடது / வலது பக்கம் Swipe செய்யவும்
              </Text>
            </View>
          </View>

          {/* =====================================================
              CONNECTION CTA
          ===================================================== */}

          <View style={styles.connectionSection}>
            <View style={styles.connectionTopPattern}>
              <View style={styles.patternRed} />

              <View style={styles.patternYellow} />

              <View style={styles.patternRedSmall} />
            </View>

            <Text style={styles.connectionEyebrow}>உங்கள் குரல் முக்கியம்</Text>

            <Text style={styles.connectionTitle}>உங்கள் தொகுதியின்</Text>

            <Text style={styles.connectionTitleHighlight}>
              பிரச்சனைகளை அறிய
            </Text>

            <Text style={styles.connectionDescription}>
              உங்கள் பகுதியின் பிரச்சனைகள், தேவைகள் மற்றும் மக்களின் கருத்துகளை
              எங்களுடன் பகிர்ந்து கொள்ளுங்கள்.
            </Text>

            {/* LOGIN CTA */}

            <Pressable
              style={({ pressed }) => [
                styles.connectionButton,
                {
                  maxWidth: isDesktop ? 500 : 600,
                },
                pressed && styles.buttonPressed,
              ]}
              onPress={goToLogin}>
              <View style={styles.connectionButtonInner}>
                <Text style={styles.connectionButtonText}>
                  எங்களுடன் இணையுங்கள்
                </Text>

                <View style={styles.connectionArrow}>
                  <Text style={styles.connectionArrowText}>→</Text>
                </View>
              </View>
            </Pressable>

            <Text style={styles.connectionBottomText}>
              Login செய்து தொடர்ந்து செயல்படுங்கள்
            </Text>
          </View>

          {/* =====================================================
              QUICK INFORMATION
          ===================================================== */}

          <View
            style={[
              styles.quickSection,
              {
                paddingHorizontal: sidePadding,
                maxWidth: contentWidth,
                alignSelf: "center",
                width: "100%",
              },
            ]}>
            <View style={styles.quickCard}>
              <Text style={styles.quickIcon}>📢</Text>

              <View style={styles.quickContent}>
                <Text style={styles.quickTitle}>மக்கள் குரல்</Text>

                <Text style={styles.quickText}>
                  உங்கள் கருத்துகளை பகிருங்கள்
                </Text>
              </View>

              <Text style={styles.quickArrow}>→</Text>
            </View>

            <View style={styles.quickCard}>
              <Text style={styles.quickIcon}>📍</Text>

              <View style={styles.quickContent}>
                <Text style={styles.quickTitle}>உங்கள் பகுதி</Text>

                <Text style={styles.quickText}>
                  உங்கள் பகுதியில் உள்ள தகவல்கள்
                </Text>
              </View>

              <Text style={styles.quickArrow}>→</Text>
            </View>

            <View style={styles.quickCard}>
              <Text style={styles.quickIcon}>📝</Text>

              <View style={styles.quickContent}>
                <Text style={styles.quickTitle}>பிரச்சனை பதிவு</Text>

                <Text style={styles.quickText}>
                  உங்கள் பிரச்சனையை தெரிவியுங்கள்
                </Text>
              </View>

              <Text style={styles.quickArrow}>→</Text>
            </View>
          </View>

          {/* =====================================================
              FOOTER
          ===================================================== */}

          <View style={styles.footer}>
            <View style={styles.footerBrandMark}>
              <View style={styles.footerRed} />

              <View style={styles.footerYellow} />
            </View>

            <Text style={styles.footerTitle}>TIRUPPUR SMART CITY</Text>

            <Text style={styles.footerName}>SSS SureshKumar</Text>

            <View style={styles.footerDivider} />

            <Text style={styles.copyright}>© 2026 SSS SureshKumar</Text>

            <Text style={styles.rights}>All Rights Reserved</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: LIGHT,
  },

  container: {
    flex: 1,
    backgroundColor: LIGHT,
  },

  scrollContent: {
    paddingBottom: 0,
  },

  pageWrapper: {
    backgroundColor: LIGHT,
  },

  /* =====================================================
     HEADER
  ===================================================== */

  header: {
    minHeight: 78,
    backgroundColor: RED,
    paddingTop: 13,
    paddingBottom: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerBrand: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },

  brandMark: {
    width: 42,
    height: 42,
    marginRight: 11,
    borderRadius: 10,
    overflow: "hidden",
    flexShrink: 0,
  },

  brandRedBlock: {
    height: "50%",
    backgroundColor: DARK_RED,
  },

  brandYellowBlock: {
    height: "50%",
    backgroundColor: YELLOW,
  },

  brandTextWrapper: {
    flex: 1,
    minWidth: 0,
  },

  brandSmall: {
    color: YELLOW,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 2,
  },

  brandTitle: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  brandTitleSmall: {
    fontSize: 13,
    letterSpacing: 0.2,
  },

  menuButton: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginLeft: 10,
    flexShrink: 0,
  },

  menuLine: {
    width: 20,
    height: 2,
    backgroundColor: WHITE,
    borderRadius: 2,
  },

  /* =====================================================
     HERO
  ===================================================== */

  heroSection: {
    backgroundColor: WHITE,
    paddingBottom: 30,
  },

  heroTopAccent: {
    height: 6,
    backgroundColor: YELLOW,
  },

  heroImageWrapper: {
    width: "100%",
    position: "relative",
    backgroundColor: "#222222",
  },

  heroImage: {
    width: "100%",
    height: "100%",
  },

  imageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.30)",
  },

  heroBadge: {
    position: "absolute",
    top: 18,
    left: 18,
    maxWidth: "70%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: RED,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },

  heroBadgeSmall: {
    left: 12,
    top: 12,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },

  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: YELLOW,
    marginRight: 7,
    flexShrink: 0,
  },

  heroBadgeText: {
    color: WHITE,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
    flexShrink: 1,
  },

  heroContent: {
    paddingTop: 26,
  },

  heroSmallTitle: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    color: RED,
    marginBottom: 8,
  },

  heroTitle: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: "900",
    color: BLACK,
  },

  heroTitleSmall: {
    fontSize: 34,
    lineHeight: 41,
  },

  heroTitleHighlight: {
    fontSize: 49,
    lineHeight: 51,
    fontWeight: "900",
    color: RED,
    marginBottom: 13,
  },

  heroTitleHighlightSmall: {
    fontSize: 41,
    lineHeight: 43,
  },

  heroDescription: {
    fontSize: 14,
    lineHeight: 23,
    color: TEXT_MUTED,
    marginBottom: 20,
    maxWidth: 680,
  },

  heroButton: {
    width: "100%",
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: RED,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    alignSelf: "center",
    shadowColor: RED,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 5,
  },

  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.985 }],
  },

  heroButtonText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "900",
  },

  heroButtonArrow: {
    color: YELLOW,
    fontSize: 24,
    fontWeight: "900",
    marginLeft: 11,
  },

  /* =====================================================
     COMMON SECTION
  ===================================================== */

  section: {
    paddingTop: 34,
    paddingBottom: 10,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 17,
  },

  sectionHeadingBlock: {
    flex: 1,
    minWidth: 0,
  },

  sectionEyebrow: {
    color: RED,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginBottom: 5,
  },

  sectionTitle: {
    color: BLACK,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "900",
  },

  sectionTitleSmall: {
    fontSize: 20,
    lineHeight: 26,
  },

  sectionAccent: {
    width: 38,
    height: 38,
    borderRadius: 12,
    overflow: "hidden",
    marginLeft: 10,
    flexShrink: 0,
  },

  sectionAccentRed: {
    flex: 1,
    backgroundColor: RED,
  },

  sectionAccentYellow: {
    flex: 1,
    backgroundColor: YELLOW,
  },

  /* =====================================================
     TOTAL VOTERS
  ===================================================== */

  totalVoterCard: {
    width: "100%",
    minHeight: 124,
    backgroundColor: RED,
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },

  totalIcon: {
    width: 58,
    height: 58,
    borderRadius: 17,
    backgroundColor: YELLOW,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    flexShrink: 0,
  },

  totalIconText: {
    fontSize: 26,
  },

  totalVoterContent: {
    flex: 1,
    minWidth: 0,
  },

  totalVoterLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 3,
  },

  totalVoterValue: {
    color: WHITE,
    fontSize: 27,
    fontWeight: "900",
  },

  totalVoterValueSmall: {
    fontSize: 24,
  },

  totalVoterSub: {
    color: YELLOW,
    fontSize: 9,
    fontWeight: "800",
    marginTop: 2,
  },

  totalArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.13)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    flexShrink: 0,
  },

  totalArrowText: {
    color: WHITE,
    fontSize: 22,
    fontWeight: "800",
  },

  /* =====================================================
     GENDER STATS
  ===================================================== */

  statsGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 12,
  },

  statCard: {
    minHeight: 142,
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 12,
    marginBottom: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  statCardSmall: {
    width: "100%",
    minHeight: 78,
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: 16,
  },

  statIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#FFF0F1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  maleIcon: {
    backgroundColor: "#FFF7D1",
  },

  femaleIcon: {
    backgroundColor: "#FFE8EA",
  },

  otherIcon: {
    backgroundColor: "#F1F1F1",
  },

  statIconText: {
    fontSize: 20,
    color: BLACK,
  },

  statLabel: {
    color: TEXT_MUTED,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },

  statValue: {
    color: BLACK,
    fontSize: 16,
    fontWeight: "900",
  },

  statsNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 11,
  },

  noteDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: RED,
    marginRight: 6,
  },

  statsNoteText: {
    color: TEXT_MUTED,
    fontSize: 9,
    fontWeight: "600",
  },

  /* =====================================================
     PROFILE
  ===================================================== */

  profileSection: {
    marginTop: 30,
    backgroundColor: BLACK,
    borderRadius: 24,
    overflow: "hidden",
  },

  profileImageContainer: {
    width: "100%",
    position: "relative",
  },

  profileImage: {
    width: "100%",
    height: "100%",
  },

  profileImageAccent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: "100%",
    height: 7,
    backgroundColor: YELLOW,
  },

  profileContent: {
    padding: 22,
  },

  profileEyebrow: {
    color: YELLOW,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginBottom: 6,
  },

  profileName: {
    color: WHITE,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "900",
    marginBottom: 11,
  },

  profileNameSmall: {
    fontSize: 22,
    lineHeight: 28,
  },

  profileDescription: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    lineHeight: 22,
  },

  profileLine: {
    flexDirection: "row",
    height: 5,
    width: 65,
    marginTop: 18,
    borderRadius: 3,
    overflow: "hidden",
  },

  profileLineRed: {
    flex: 1,
    backgroundColor: RED,
  },

  profileLineYellow: {
    flex: 1,
    backgroundColor: YELLOW,
  },

  /* =====================================================
     GALLERY
  ===================================================== */

  cameraCircle: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#FFF0F1",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
    flexShrink: 0,
  },

  cameraIcon: {
    fontSize: 19,
  },

  galleryViewport: {
    overflow: "hidden",
    borderRadius: 22,
  },

  galleryScroll: {
    alignItems: "center",
  },

  gallerySlide: {
    paddingHorizontal: 0,
  },

  galleryCard: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#DDDDDD",
    position: "relative",
  },

  galleryImage: {
    width: "100%",
    height: "100%",
  },

  galleryOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: 65,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: "rgba(0,0,0,0.65)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  galleryOverlayContent: {
    flex: 1,
    minWidth: 0,
  },

  galleryOverlayText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "900",
  },

  galleryOverlaySub: {
    color: YELLOW,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },

  galleryCounter: {
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 14,
    marginLeft: 10,
  },

  galleryCounterText: {
    color: WHITE,
    fontSize: 10,
    fontWeight: "800",
  },

  morePhotosCard: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
    backgroundColor: YELLOW,
    alignItems: "center",
    justifyContent: "center",
  },

  morePhotosIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: RED,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },

  morePhotosIconText: {
    color: WHITE,
    fontSize: 32,
    fontWeight: "300",
  },

  morePhotosTitle: {
    color: BLACK,
    fontSize: 20,
    fontWeight: "900",
  },

  morePhotosSubtitle: {
    color: BLACK,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },

  swipeHint: {
    color: "rgba(0,0,0,0.55)",
    fontSize: 10,
    fontWeight: "800",
    marginTop: 22,
  },

  carouselHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },

  carouselDotActive: {
    width: 18,
    height: 5,
    borderRadius: 3,
    backgroundColor: RED,
    marginRight: 5,
  },

  carouselDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
    marginRight: 9,
  },

  carouselHintText: {
    color: TEXT_MUTED,
    fontSize: 9,
    fontWeight: "600",
  },

  /* =====================================================
     CONNECTION CTA
  ===================================================== */

  connectionSection: {
    marginTop: 38,
    backgroundColor: RED,
    paddingHorizontal: 22,
    paddingTop: 35,
    paddingBottom: 34,
    alignItems: "center",
    overflow: "hidden",
  },

  connectionTopPattern: {
    flexDirection: "row",
    position: "absolute",
    top: 0,
    right: 0,
    height: 7,
  },

  patternRed: {
    width: 45,
    backgroundColor: DARK_RED,
  },

  patternYellow: {
    width: 45,
    backgroundColor: YELLOW,
  },

  patternRedSmall: {
    width: 45,
    backgroundColor: DARK_RED,
  },

  connectionEyebrow: {
    color: YELLOW,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 11,
    textAlign: "center",
  },

  connectionTitle: {
    color: WHITE,
    fontSize: 28,
    lineHeight: 35,
    fontWeight: "900",
    textAlign: "center",
  },

  connectionTitleHighlight: {
    color: YELLOW,
    fontSize: 28,
    lineHeight: 35,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 13,
  },

  connectionDescription: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 13,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 620,
    marginBottom: 21,
  },

  connectionButton: {
    width: "100%",
    minHeight: 57,
    backgroundColor: YELLOW,
    borderRadius: 16,
    paddingHorizontal: 16,
  },

  connectionButtonInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  connectionButtonText: {
    color: BLACK,
    fontSize: 15,
    fontWeight: "900",
  },

  connectionArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: RED,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 11,
  },

  connectionArrowText: {
    color: WHITE,
    fontSize: 19,
    fontWeight: "900",
  },

  connectionBottomText: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 9,
    fontWeight: "700",
    marginTop: 11,
  },

  /* =====================================================
     QUICK INFORMATION
  ===================================================== */

  quickSection: {
    paddingTop: 28,
    paddingBottom: 10,
  },

  quickCard: {
    minHeight: 74,
    backgroundColor: WHITE,
    borderRadius: 17,
    paddingHorizontal: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: RED,
    borderWidth: 1,
    borderColor: BORDER,
  },

  quickIcon: {
    fontSize: 24,
    marginRight: 13,
  },

  quickContent: {
    flex: 1,
    minWidth: 0,
  },

  quickTitle: {
    color: BLACK,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 3,
  },

  quickText: {
    color: TEXT_MUTED,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "600",
  },

  quickArrow: {
    color: RED,
    fontSize: 20,
    fontWeight: "900",
    marginLeft: 8,
  },

  /* =====================================================
     FOOTER
  ===================================================== */

  footer: {
    backgroundColor: BLACK,
    marginTop: 25,
    paddingHorizontal: 20,
    paddingTop: 34,
    paddingBottom: 30,
    alignItems: "center",
  },

  footerBrandMark: {
    width: 45,
    height: 6,
    flexDirection: "row",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 16,
  },

  footerRed: {
    flex: 1,
    backgroundColor: RED,
  },

  footerYellow: {
    flex: 1,
    backgroundColor: YELLOW,
  },

  footerTitle: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.8,
    textAlign: "center",
  },

  footerName: {
    color: YELLOW,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 6,
    textAlign: "center",
  },

  footerDivider: {
    width: 55,
    height: 1,
    backgroundColor: "#444444",
    marginVertical: 17,
  },

  copyright: {
    color: "#AAAAAA",
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },

  rights: {
    color: "#777777",
    fontSize: 9,
    marginTop: 5,
    textAlign: "center",
  },
});
