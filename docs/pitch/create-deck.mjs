import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
const runtimeModules = process.env.RUNTIME_NODE_MODULES;
if (!runtimeModules)
  throw new Error(
    "Set RUNTIME_NODE_MODULES to the bundled artifact-tool node_modules directory.",
  );
const runtimeRequire = createRequire(path.join(runtimeModules, "package.json"));
const { Presentation, PresentationFile } = await import(
  pathToFileURL(runtimeRequire.resolve("@oai/artifact-tool")).href
);

const project = path.resolve(process.argv[2] || ".");
const workspaceDir = path.resolve(process.argv[3] || "pitch-build");
const SKILL_DIR = process.env.PRESENTATIONS_SKILL_DIR;
if (!SKILL_DIR || !process.env.PYTHON_EXECUTABLE)
  throw new Error("Set PRESENTATIONS_SKILL_DIR and PYTHON_EXECUTABLE.");
await fs.mkdir(path.join(workspaceDir, "build"), { recursive: true });
await fs.mkdir(path.join(workspaceDir, "output"), { recursive: true });
const { finalizePresentation, resolvePresentationFont } = await import(
  pathToFileURL(path.join(SKILL_DIR, "container_tools/artifact_tool_utils.mjs"))
    .href
);
const FONT = resolvePresentationFont({ fontFamily: "Arial" }),
  ink = "#173B2B",
  paper = "#FAFBF7",
  muted = "#53634F",
  lime = "#D5EE81";
const deck = Presentation.create({ slideSize: { width: 1280, height: 720 } }),
  site = "https://chargeneighbour-theta.vercel.app";
function text(slide, value, x, y, w, h, size = 28, bold = false, color = ink) {
  const s = slide.shapes.add({
    geometry: "textbox",
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { fill: "none", width: 0 },
  });
  s.text = value;
  s.text.style = {
    typeface: FONT,
    fontSize: size,
    bold,
    color,
    verticalAlignment: "top",
    autoFit: "none",
    wrap: "square",
    insets: 0,
  };
  return s;
}
function page(title, number, dark = false) {
  const s = deck.slides.add();
  s.background.fill = dark ? ink : paper;
  if (title) text(s, title, 72, 66, 1136, 95, 48, true, dark ? paper : ink);
  text(
    s,
    "ChargeNeighbour, pilot proposal",
    72,
    670,
    900,
    26,
    18,
    false,
    dark ? lime : muted,
  );
  text(
    s,
    String(number).padStart(2, "0"),
    1162,
    670,
    46,
    26,
    18,
    false,
    dark ? lime : muted,
  );
  return s;
}
function note(s, value) {
  s.speakerNotes.text = value;
}
function row(s, title, body, y, width = 1080) {
  text(s, title, 80, y, 350, 60, 28, true);
  text(s, body, 460, y, width - 380, 85, 27, false, muted);
}
function table(s, values, widths, y, height) {
  const t = s.tables.add({
    rows: values.length,
    columns: values[0].length,
    left: 72,
    top: y,
    width: 1136,
    height,
    columnWidths: widths,
    values,
  });
  t.borders.assign({ style: "solid", fill: "#D5DDCD", width: 1 });
  for (let r = 0; r < values.length; r++)
    for (let c = 0; c < values[0].length; c++) {
      const cell = t.getCell(r, c);
      cell.fill = r === 0 ? ink : paper;
      cell.text.style = {
        typeface: FONT,
        fontSize: 24,
        color: r === 0 ? paper : ink,
        bold: r === 0,
      };
    }
  return t;
}

// 1. Brand and concept imagery supplied by the existing project.
let s = page("", 1);
const image = await fs.readFile(
  path.join(project, "public/images/neighbourhood-hero.webp"),
);
s.images.add({
  blob: image.buffer.slice(
    image.byteOffset,
    image.byteOffset + image.byteLength,
  ),
  contentType: "image/webp",
  alt: "AI concept image of an EV beside a home charger, not a participating host",
  fit: "cover",
  position: { left: 760, top: 0, width: 520, height: 720 },
});
text(s, "chargeneighbour.", 72, 68, 650, 65, 42, true);
text(s, "Find a charge.\nShare your\ncharger.", 72, 192, 650, 310, 72, true);
text(
  s,
  "A proposed neighbourhood EV charging pilot",
  72,
  530,
  620,
  85,
  28,
  false,
  muted,
);
text(
  s,
  "AI concept image, not a participating host",
  72,
  628,
  640,
  26,
  19,
  false,
  muted,
);
note(
  s,
  "Project concept and branding: " +
    site +
    " and https://github.com/siddarthabm123/chargeneighbour . The project owns the supplied AI concept illustration. It does not depict a verified host. Stage: prototype and proposed pilot, 20 October 2026.",
);

s = page("The customer problem", 2);
text(
  s,
  "Finding a charger does not\nconfirm a usable stop",
  72,
  188,
  1090,
  150,
  54,
  true,
);
row(
  s,
  "Compatibility",
  "The driver needs the right connector and usable power.",
  380,
);
row(
  s,
  "Access",
  "Entry rules, parking and opening hours shape the visit.",
  480,
);
row(s, "Confidence", "Price and reported availability need confirmation.", 580);
note(
  s,
  "These are product hypotheses and practical verification needs, not survey findings. Google station data does not guarantee access or availability. Source: https://developers.google.com/maps/documentation/places/web-service/policies . Validate the frequency and importance of these problems through driver interviews.",
);

s = page("The mobile driver journey", 3);
row(
  s,
  "Search immediately",
  "Enter a destination or choose optional GPS for nearby places.",
  195,
);
row(
  s,
  "Check compatibility",
  "Separate supplied connector information from unknown specifications.",
  305,
);
row(
  s,
  "Explore the stop",
  "Inspect station details. The sample gallery labels its AI images and reviews.",
  415,
);
row(
  s,
  "Preview the road route",
  "See a road line, driving distance and estimated time inside the website.",
  525,
);
text(
  s,
  "Public discovery and demo samples stay separate from approved host bookings.",
  72,
  625,
  1120,
  32,
  22,
  false,
  muted,
);
note(
  s,
  "Current mobile product: " +
    site +
    " . OpenStreetMap/Photon discovery and limited OSRM road routes work without Google billing. Time excludes live traffic. Unknown specifications do not establish compatibility. The demo gallery and fictional reviews are explicitly labelled. Host applications require private photo/GPS evidence and actual manual review. Reservations remain gated. No operating inventory or sessions are claimed.",
);

s = page("The first customer and host", 4);
text(s, "Drivers planning an AC top-up", 72, 200, 530, 90, 36, true);
text(
  s,
  "During a visit, errand or workday\n\nA compatible vehicle\nA useful charging dwell time\nAn accessible parking space",
  72,
  310,
  510,
  260,
  28,
  false,
  muted,
);
text(s, "Owners with spare charging hours", 704, 200, 510, 100, 36, true);
text(
  s,
  "Type 2 AC equipment\n\nPermission to admit visitors\nClear entry and parking rules\nReviewed equipment and metering",
  704,
  310,
  500,
  260,
  28,
  false,
  muted,
);
text(
  s,
  "The pilot tests willingness to share and repeat demand before expansion.",
  72,
  617,
  1120,
  40,
  25,
  false,
  ink,
);
note(
  s,
  "Customer and host segment selection is an internal pilot hypothesis. The project focuses initially on Type 2 AC car charging and does not claim emergency DC charging. Electrical/property review is a launch dependency. Context on Indian EV charging standards: https://www.pib.gov.in/PressReleasePage.aspx?PRID=2151393&lang=2&reg=48 . No regulatory approval for any host is asserted.",
);

s = page("A concentrated first market", 5, true);
text(
  s,
  "One useful neighbourhood\nbefore wider coverage",
  72,
  193,
  1136,
  145,
  58,
  true,
  paper,
);
text(
  s,
  "Applications can come from across India.\nThe first operating area follows verified supply and local driver demand.",
  72,
  382,
  1090,
  110,
  31,
  false,
  paper,
);
text(s, "Bottom-up market sizing", 72, 545, 570, 50, 31, true, lime);
text(
  s,
  "Compatible drivers × repeat charging need × usable host hours",
  72,
  598,
  1120,
  45,
  27,
  false,
  paper,
);
note(
  s,
  "Geographic strategy and market-sizing method are proposed. No city has been declared operational, and no nationwide host coverage or TAM figure is asserted. Source: project public launch plan " +
    site +
    "/launch-plan.md . The database serves all locations without separate regional datasets.",
);

s = page("Existing options and the pilot hypothesis", 6);
table(
  s,
  [
    ["Approach", "Customer starting point", "Question for this pilot"],
    [
      "Public discovery maps",
      "Find a public charging location",
      "Which visits still fail on access?",
    ],
    [
      "Operator networks",
      "Use a participating network",
      "Where is a local AC option useful?",
    ],
    [
      "ChargeNeighbour proposal",
      "Request reviewed home AC access",
      "Will hosts admit repeat drivers reliably?",
    ],
  ],
  [300, 410, 426],
  195,
  342,
);
text(
  s,
  "The intended advantage depends on dependable local supply and successful repeat sessions.",
  72,
  580,
  1110,
  65,
  28,
  false,
  muted,
);
note(
  s,
  "This comparison describes broad customer options, not an exhaustive feature comparison or a claim that competitors lack bookings. Public discovery references: https://www.google.com/maps and https://www.plugshare.com/ . ChargeNeighbour differentiation is a hypothesis to validate, not an established moat. No partnership is claimed.",
);

s = page("One illustrative session", 7);
table(
  s,
  [
    ["Assumption or result", "Amount"],
    ["Delivered energy", "10 kWh"],
    ["Assumed customer rate", "₹16 per kWh"],
    ["Customer charging value", "₹160"],
    ["Proposed commission at 15%", "₹24"],
    ["Host after commission", "₹136"],
    ["Assumed electricity at ₹8 per kWh", "₹80"],
    ["Host surplus before other costs and tax", "₹56"],
  ],
  [820, 316],
  168,
  405,
);
text(
  s,
  "Platform revenue must cover payment, maps, support, refunds and acquisition costs.",
  72,
  600,
  1120,
  65,
  26,
  false,
  muted,
);
note(
  s,
  "All figures are illustrative business assumptions, not validated tariffs, delivered margins or earnings. Arithmetic: 10*16=160; 160*0.15=24; 160-24=136; 10*8=80; 136-80=56. Other costs and taxes remain unquantified. Source: " +
    site +
    "/pitch-brief.md . The proposed settlement/payment model requires provider eligibility and final tax/fee arrangements.",
);

s = page("The proposed pilot", 8);
text(s, "5–10", 72, 198, 450, 110, 86, true);
text(
  s,
  "verified hosts in a concentrated area",
  72,
  325,
  485,
  85,
  30,
  false,
  muted,
);
text(s, "30–50", 704, 198, 470, 110, 86, true);
text(
  s,
  "supervised sessions after launch approval",
  704,
  325,
  500,
  90,
  30,
  false,
  muted,
);
text(s, "Driver discovery", 72, 475, 360, 55, 31, true);
text(
  s,
  "20–30 interviews to test the need and current alternatives",
  460,
  475,
  720,
  85,
  29,
  false,
  muted,
);
text(
  s,
  "Planning targets only. No host, customer or completed-session traction is claimed.",
  72,
  606,
  1136,
  50,
  24,
  false,
  ink,
);
note(
  s,
  "These are suggested validation targets, not industry benchmarks or achieved traction. Measure successful entry, completed charging, delivered energy, repeat usage, support effort, refunds and contribution after variable costs. Source: internal launch audit and public launch plan " +
    site +
    "/launch-plan.md .",
);

s = page("Product progress and launch gates", 9);
text(s, "Implemented foundation", 72, 191, 520, 60, 34, true);
text(
  s,
  "Mobile search and road-route preview\n\nPhoto and GPS review workflow\n\nAccount, support and session records\n\nTested ownership/payment safeguards",
  72,
  285,
  520,
  310,
  27,
  false,
  muted,
);
text(s, "Before commercial charging", 704, 191, 505, 75, 34, true);
text(
  s,
  "Actual legal operator and public contact\n\nProduction email and routing capacity\n\nVerified hosts and merchant approval\n\nFinal policies and supervised acceptance",
  704,
  285,
  505,
  310,
  27,
  false,
  muted,
);
note(
  s,
  "Implementation status comes from the repository and the website release on 20 October 2026. Isolated PostgreSQL, RLS, overlap, billing and webhook replay tests passed during development. These checks do not certify electrical safety, live Google/SMTP, merchant approval or production multi-connection acceptance. No commercial activation is asserted. Source: https://github.com/siddarthabm123/chargeneighbour and " +
    site +
    "/status .",
);

s = page("The founding pilot", 10, true);
text(
  s,
  "A small group can test\na useful local network",
  72,
  192,
  1130,
  145,
  60,
  true,
  paper,
);
text(
  s,
  "Seeking charger owners with accessible parking\nand community partners who can recruit local drivers",
  72,
  382,
  1110,
  100,
  31,
  false,
  paper,
);
text(
  s,
  "Next milestone: reviewed hosts and supervised charging sessions",
  72,
  533,
  1120,
  58,
  29,
  true,
  lime,
);
const link = text(
  s,
  "chargeneighbour-theta.vercel.app/support",
  72,
  610,
  1120,
  43,
  28,
  false,
  paper,
);
link.text = [
  {
    run: "chargeneighbour-theta.vercel.app/support",
    link: { uri: site + "/support", isExternal: true },
  },
];
link.text.style = { typeface: FONT, fontSize: 28, color: paper };
note(
  s,
  "This is a request for founding hosts and pilot partners. No funding valuation, investment return, commercial partnership, insurance cover, signed host count or operating revenue is asserted. Team/operator identity and the first operating area remain to be provided by the project owner. Contact via the actual website support form.",
);

for (const [i, slide] of deck.slides.items.entries()) {
  const blob = await deck.export({ slide, format: "png", scale: 1 });
  await fs.writeFile(
    path.join(
      workspaceDir,
      "build",
      `slide-${String(i + 1).padStart(2, "0")}.png`,
    ),
    new Uint8Array(await blob.arrayBuffer()),
  );
}
const candidatePath = path.join(workspaceDir, "build", "candidate.pptx");
await (await PresentationFile.exportPptx(deck)).save(candidatePath);
const finalPath = path.join(
  workspaceDir,
  "output",
  "ChargeNeighbour-pilot-pitch.pptx",
);
await finalizePresentation({
  workspaceDir,
  candidatePath,
  finalPath,
  pythonExecutable: process.env.PYTHON_EXECUTABLE,
  integrityValidatorPath: path.join(
    SKILL_DIR,
    "container_tools/inspect_presentation_package_integrity.py",
  ),
  layoutValidatorPath: path.join(
    SKILL_DIR,
    "container_tools/inspect_presentation_layout_geometry.py",
  ),
  layoutArgs: [
    "--expected-slide-size-emu",
    "12192000,6858000",
    "--validate-bullet-geometry",
    "--validate-heading-fit",
  ],
  explicitTotalSlideCount: 10,
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [],
  fontPolicy: { basis: "design", families: [FONT] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(workspaceDir, "build", "validation.json"),
});
console.log(
  "Created ten-slide pitch deck with editable text and native comparison/economics tables.",
);
