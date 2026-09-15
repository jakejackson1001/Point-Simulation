# Point Kinetics

A static point reactor kinetics study. Includes the complete report PDF, five original figures, report tables, Python source ZIP, and a separate browser sandbox. No build step, backend, CDN, framework, tracking, or API key.

## Run and deploy

From this folder:

```sh
python3 -m http.server 8766
```

Open http://localhost:8766. Use HTTP rather than opening index.html directly: the sandbox fetches its parameter JSON and imports a module.

For Netlify, upload **this folder** (the directory containing index.html) as a manual site deploy. For a Git-connected deployment, use this directory as the publish directory and leave the build command empty. No deployment has been performed. All site assets are relative URLs.

GitHub repository: https://github.com/jakejackson1001/Point-Simulation. source.zip contains kinetics.py, pinned requirements.txt, and reproduction instructions. The source script generates the figures and runs its numerical checks. See report/technical_report.pdf for additional table reproduction.

## Document styling

Independent white document layout with neutral text, serif body type, ordinary underlined links, and thin-bordered tables. No cards, badges, shadows, gradients, or product buttons. Technical content, figures, report, source bundle, and sandbox are retained. The summary values use a standard table. Controls use native labeled inputs with visible keyboard focus; the layout stacks on narrow screens.

## Two calculations, separate evidence

**Report:** Python/SciPy Radau, rtol 1e-8 and atol 1e-10, equilibrium initial conditions. Selected cases have matrix-exponential and tolerance-refinement checks. The displayed tables and PNGs are those of the report, not computed by the browser. Group data are thermal U-235 yield fractions used as illustrative effective fractions, without reactor-specific importance weighting.

**Sandbox:** solver.mjs implements the same seven ODEs using a two-stage, second-order, L-stable diagonally implicit Runge–Kutta method (SDIRK2, γ = 1 − 1/√2). Each stage solves the linear arrowhead matrix directly. This avoids the explicit RK4 stability problem at neutron timescales: hundreds of explicit steps over a minute would not be adequate for either generation time.

For numerical scaling the browser stores cᵢ = Cᵢ/Cᵢ(0). Thus all seven initial values equal one, dcᵢ/dt = λᵢ(n − cᵢ), and dn/dt = [(ρ − β)/Λ]n + Σ(βᵢ/Λ)cᵢ. This is an equivalent change of variables, including a freshly defined equilibrium for each Λ.

Internal steps begin at 1 µs, grow with elapsed time, and are capped at 10 ms. Steps end exactly at requested output times and the ramp endpoint. This is a prescribed step schedule, not adaptive error control. The SVG samples power densely near zero and every 0.1 s thereafter; its axes rescale per scenario. Values are shown to four decimals to distinguish the illustrative output from report tables.

Supported domain: −0.20 to +0.20 dollars, step or a 1–30 second ramp, Λ of 100 or 10 µs, duration 60 s. Inputs beyond this range are rejected. This bounded range is the sandbox's deliberate scope; broader ranges need new numerical comparisons and presentation choices.

## Development comparison check

The development-only comparison script is retained outside the site folder and is not included in either download.

This extracts the source to a temporary directory, runs its existing checks, and compares browser output with SciPy in 40 cases: five signed/zero reactivities × four step/ramp histories × two generation times. It checks all seven normalized states at 0, 0.001, 0.01, 0.1, 1, 10, 30 and 60 seconds, plus invalid input rejection. Threshold: 0.01% relative disagreement. Observed maximum: 1.81e-6 relative (0.000181%). This is sampled numerical agreement, not a rigorous bound for every UI input or time, and not physical validation. The browser does not run these checks on every update.

Both models omit thermal feedback, spatial dynamics, burnup, poisoning, external sources, and decay heat. They do not predict electrical output, total heat removal, or a named plant's behavior.
