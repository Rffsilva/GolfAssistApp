// Black Mountain Golf Club, Hua Hin — course data.
// Yardages in YARDS. Sources: offcourse.co (East/North, tee system 76…57),
// golfpass.com (West, mapped onto tees 73…57). Verify against the card at the club
// and edit freely — the app reads everything from this file.
// West stroke indexes (12,16,10,4,18,6,2,14,8) and the North→West / West→East combination
// indexes match the published club card as listed on thegrint.com and huahingolfcourse.com.
// West 76 tee: only the nine total (3732 yd) is published, no per-hole yardages, so it stays null.
// tips: d = danger / what to watch out for, a = where to aim. West tips are based on the
// scorecard only (no published hole guide found) — overwrite them with your own.
window.COURSE = {
  name: "Black Mountain Golf Club",
  location: "Hin Lek Fai, Hua Hin, Thailand",
  center: [12.6145, 99.8917],
  tees: [
    { id: "76", short: "Champ", label: "76 · Championship" },
    { id: "73", short: "Pro", label: "73 · Pro" },
    { id: "70", short: "Low hcp", label: "70 · Low h'cap" },
    { id: "65", short: "Men", label: "65 · Men" },
    { id: "61", short: "Men", label: "61 · Men" },
    { id: "57", short: "Ladies", label: "57 · Ladies" }
  ],
  nines: {
    east: {
      tips: [
        { d: "Often plays into the wind \u2014 take an extra club off the tee and in.", a: "Big, rolling green: aim for the middle and two-putt." },
        { d: "Pond right off the tee; creek crosses ~50 yd short of the green.", a: "Lay up short of the creek to your favourite wedge number." },
        { d: "Little trouble \u2014 don't get greedy at a tucked pin.", a: "Middle of the green: genuine birdie chance." },
        { d: "Island green; lake reachable from the back tees (~280).", a: "Club down off the tee, then a full swing to the middle of the island." },
        { d: "Fairway bunker off the tee, and the approach plays uphill.", a: "Avoid the bunker, then take one extra club into the green." },
        { d: "Water around the peninsula green.", a: "Safe line is right; stay below the hole \u2014 green slopes back to front." },
        { d: "Hardest hole: ~260 carry over the lake; big bunker left of green.", a: "If you can't carry it, bail left and accept a long uphill second." },
        { d: "All carry over water, bunker in front \u2014 short is dead.", a: "Club up and aim middle-to-back of the green." },
        { d: "Water and sand on one side of the green, swale on the other.", a: "Fire at the middle; the swale is the better miss." }
      ],
      name: "East",
      par: [4, 5, 3, 4, 4, 5, 4, 3, 4],
      yards: {
        "76": [466, 558, 165, 398, 420, 611, 493, 203, 479],
        "73": [439, 540, 165, 398, 420, 606, 477, 203, 458],
        "70": [423, 521, 165, 383, 379, 598, 459, 193, 438],
        "65": [403, 478, 159, 361, 366, 576, 409, 154, 430],
        "61": [380, 457, 140, 336, 354, 553, 393, 139, 377],
        "57": [361, 427, 132, 318, 324, 480, 360, 122, 358]
      },
      notes: [
        "",
        "Pond on the right roughly 260 out from the back tees. A creek cuts across about 50 short of the green and swings right — decide early: lay up short of it, or carry it in two.",
        "",
        "Downhill dogleg left. Big hitters can reach the lake around 280 off the tee. Approach to an island green with bunkers both sides — take enough club.",
        "",
        "Downhill, bends right then left and plays shorter than the card. Long hitters can take on the water; the safe line is right. Deep green, slopes back to front.",
        "Long par 4 with a hard dogleg right. About 260 carry clears the lake; bailing left leaves a long uphill second. Big bunker guards the left of a back-to-front green.",
        "All carry over water with a big bunker in front. Green tilts hard back to front — short is the miss to avoid, but don't go long either.",
        ""
      ]
    },
    north: {
      tips: [
        { d: "Over-cutting the dogleg corner.", a: "Pick a line you can carry \u2014 good birdie chance with the right drive." },
        { d: "Water short, right and long of the green.", a: "Bail left toward the waterfall side; take the middle of the green." },
        { d: "Plays uphill and longer than the card; bunker left of green.", a: "Extra club for the approach; the miss is right (swale)." },
        { d: "Rock-lined creek / water ~60 yd short of the green.", a: "Three-shot it: lay up short of the creek, wedge in for birdie." },
        { d: "Lake to carry; long bunker down the whole left side.", a: "Aim right-centre; back-left pins aren't worth chasing." },
        { d: "Creek all along the left \u2014 a card wrecker (SI 2).", a: "Favour the right side off the tee; the second shot is the hard one." },
        { d: "Shortish dogleg \u2014 driving through the corner.", a: "Position over power: hybrid/iron to the corner, short iron in." },
        { d: "Long carry over the creek; water in front of and behind the green.", a: "Only go for it with a perfect look \u2014 otherwise lay up and wedge." },
        { d: "Water along the approach; deep bunkers ring the green.", a: "Three good shots \u2014 par here is a win." }
      ],
      name: "North",
      par: [4, 3, 4, 5, 3, 4, 4, 4, 5],
      yards: {
        "76": [407, 235, 439, 599, 225, 481, 410, 366, 595],
        "73": [396, 191, 428, 576, 199, 403, 392, 366, 595],
        "70": [383, 170, 415, 558, 187, 379, 372, 345, 582],
        "65": [370, 154, 400, 532, 171, 341, 329, 324, 512],
        "61": [353, 137, 366, 508, 164, 333, 274, 318, 502],
        "57": [337, 122, 350, 476, 146, 320, 248, 304, 484]
      },
      notes: [
        "",
        "Signature hole (the old 11th). Long and downhill, water front, right and behind the green. The waterfall on the left is scenery, not a hazard — left is the safe side.",
        "Straight and uphill toward the mountain; plays longer than the yardage. Wide fairway, but the second needs length and accuracy. Bunker left of the green, swale right.",
        "Risk/reward par 5. The green is protected by a rock-lined creek — only go for it in two with a clean look.",
        "Tee shot over a lake. A long bunker runs the whole left side of the green; a back-left pin is the toughest flag on the hole.",
        "",
        "Shortish dogleg par 4 — position off the tee matters more than distance.",
        "Risk/reward: long hitters can go at the green, but it's a long carry over the creek.",
        "Tough finisher. The green is ringed by deep bunkers — par is a good score."
      ]
    },
    west: {
      tips: [
        { d: "Card only \u2014 no published hole guide yet.", a: "Opener: find the fairway, middle of the green." },
        { d: "Long par 3 (~200 from the back).", a: "Take enough club; middle of the green is a good result." },
        { d: "Mid-length par 4 \u2014 bunkers frame the landing area.", a: "Fairway first, then attack the green with a mid/short iron." },
        { d: "Longest par 4 on the nine (SI 4).", a: "Driver in the fairway; bogey is not a disaster." },
        { d: "Shortest hole on the nine (SI 18).", a: "Birdie chance \u2014 just stay on the green." },
        { d: "Long par 5 through the canyon.", a: "Three-shot hole: plan the lay-up to a full-wedge yardage." },
        { d: "Hardest hole on the West (SI 2).", a: "Play for the fat part of the green; take par and run." },
        { d: "Shorter par 4 \u2014 don't overcook the tee shot.", a: "Position off the tee for a short-iron approach." },
        { d: "Longest hole on the West (~600 from the back).", a: "Three solid shots; leave a full swing into the green." }
      ],
      name: "West",
      par: [4, 3, 4, 4, 3, 5, 4, 4, 5],
      yards: {
        "76": [null, null, null, null, null, null, null, null, null],
        "73": [395, 199, 377, 425, 165, 578, 420, 376, 601],
        "70": [374, 188, 365, 416, 148, 563, 406, 360, 588],
        "65": [330, 171, 353, 399, 135, 494, 385, 327, 575],
        "61": [307, 158, 330, 370, 125, 473, 355, 313, 537],
        "57": [280, 141, 301, 345, 114, 420, 316, 275, 506]
      },
      notes: ["", "", "", "", "", "", "", "", ""]
    }
  },
  // 18-hole combinations (first nine, second nine) with stroke index per nine.
  // "est" marks indexes that are estimated rather than taken from a published card.
  // NOTE: East→North uses the older offcourse.co indexes; the newer club card lists East as
  // 7,13,15,11,1,9,5,17,3 and North as 6,10,2,8,14,4,18,16,12 (see thegrint.com) — unconfirmed which applies.
  routes: [
    {
      id: "east-north", label: "East → North", nines: ["east", "north"],
      si: [[7, 13, 17, 11, 3, 15, 1, 9, 5], [10, 18, 4, 16, 6, 2, 12, 14, 8]], est: [false, false]
    },
    {
      id: "north-west", label: "North → West", nines: ["north", "west"],
      si: [[6, 10, 2, 8, 14, 4, 18, 16, 12], [11, 15, 9, 3, 17, 5, 1, 13, 7]], est: [false, false]
    },
    {
      id: "west-east", label: "West → East", nines: ["west", "east"],
      si: [[12, 16, 10, 4, 18, 6, 2, 14, 8], [7, 13, 15, 11, 1, 9, 5, 17, 3]], est: [false, false]
    }
  ]
};
