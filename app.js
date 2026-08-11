const initialDecision = {
  crop: 'Tomato',
  growthStage: 'Flowering',
  problem: 'Possible fungal disease',
  farmSize: '2 acres',
  budget: 'Low',
  labor: '2 workers',
  water: 'Limited',
  urgency: 'high',
  rainProbability: 70,
  rainExpectedInHours: 5,
  windSpeed: 10,
  temperature: 23,
  humidity: 78,
  imageEvidence: 'Visible soft leaf spots / possible fungal disease'
};

function getWeatherText(probability) {
  if (probability >= 70) {
    return 'Rain likely';
  } else if (probability >= 35) {
    return 'Mixed rain';
  }
  return 'Dry window';
}

function getDecision() {
  const crop = document.getElementById('cropSelect').value || initialDecision.crop;
  const growthStage = document.getElementById('growthStage').value || initialDecision.growthStage;
  const problem = document.querySelector('[data-problem].selected')?.dataset.problem || initialDecision.problem;
  const farmSize = document.getElementById('farmSize').value || initialDecision.farmSize;
  const budget = document.getElementById('budget').value || initialDecision.budget;
  const labor = document.getElementById('labor').value || initialDecision.labor;
  const water = document.getElementById('water').value || initialDecision.water;
  const urgency = document.getElementById('urgency').value || initialDecision.urgency;
  const rainProbability = Number(document.getElementById('weatherRain').value || initialDecision.rainProbability);

  return {
    crop,
    growthStage,
    problem,
    farmSize,
    budget,
    labor,
    water,
    urgency,
    rainProbability,
    rainExpectedInHours: rainProbability >= 50 ? 5 : 24,
    windSpeed: 10,
    temperature: 23,
    humidity: 78,
    imageEvidence: 'Visible soft leaf spots / possible fungal disease'
  };
}

function scoreAction(decision, action) {
  let base = 46;
  const rain = decision.rainProbability;
  const urgency = decision.urgency;

  if (action.name === 'Wait until tomorrow morning') {
    base += 24;
    if (rain >= 55) base += 20;
    if (decision.water === 'Limited') base += 4;
    if (decision.budget === 'Low') base += 6;
  }

  if (action.name === 'Targeted inspection and remove affected material') {
    base += 25;
    if (rain >= 70) base += 2;
    if (decision.labor === '8 workers') base += 6;
    if (decision.labor === '2 workers') base += 1;
  }

  if (action.name === 'Act immediately with treatment') {
    base -= 22;
    if (rain >= 50) base -= 30;
    if (decision.water === 'Limited') base += 2;
    if (decision.budget === 'Low') base -= 4;
    if (decision.urgency === 'low') base -= 4;
  }

  if (action.name === 'Monitor and reassess by tomorrow') {
    base += 12;
    if (rain >= 60) base += 15;
    if (decision.budget === 'Low') base += 8;
  }

  if (decision.crop === 'Rice' && decision.water === 'Limited') {
    base += 6;
  }

  if (decision.crop === 'Tomato' && decision.growthStage === 'Flowering') {
    base += 3;
  }

  if (decision.urgency === 'high' && action.name === 'Monitor and reassess by tomorrow') {
    base -= 3;
  }

  if (budgetPenalty(decision.budget, action.cost)) {
    base -= 7;
  }

  return Math.max(40, Math.min(96, Math.round(base)));
}

function budgetPenalty(budget, cost) {
  const budgetMap = {
    'Low': ['High', 'Medium'],
    'Medium': ['High'],
    'Flexible': []
  };

  return cost && budgetMap[budget] && budgetMap[budget].includes(cost);
}

function generateDecision(decision) {
  const crop = decision.crop;
  const stage = decision.growthStage;
  const problem = decision.problem;
  const rain = decision.rainProbability;
  const budget = decision.budget;

  const options = [];

  const immediateTreatment = {
    name: 'Act immediately with treatment',
    cost: 'Medium',
    weatherRisk: rain >= 55 ? 'High' : 'Moderate',
    effort: decision.labor,
    urgency: 'High',
    score: 0,
    action: 'Immediate intervention',
    details: 'Apply a targeted treatment and inspect the field quickly.'
  };

  const waitTomorrow = {
    name: 'Wait until tomorrow morning',
    cost: 'Low',
    weatherRisk: rain >= 55 ? 'Low' : 'Low',
    effort: '1–2 workers',
    urgency: 'Medium',
    score: 0,
    action: 'Delay weather-sensitive activity',
    details: 'Wait for a safer weather window before applying weather-sensitive treatments.'
  };

  const targeted = {
    name: 'Targeted inspection and remove affected material',
    cost: 'Low',
    weatherRisk: 'Low',
    effort: decision.labor,
    urgency: 'High',
    score: 0,
    action: 'Low-cost response now',
    details: 'Remove severely affected plants and monitor the remaining field closely.'
  };

  const monitor = {
    name: 'Monitor and reassess by tomorrow',
    cost: 'Low',
    weatherRisk: 'Low',
    effort: '1–2 workers',
    urgency: 'Low',
    score: 0,
    action: 'Low-cost observation',
    details: 'Monitor crop condition and avoid unnecessary intervention.'
  };

  const normalized = [immediateTreatment, waitTomorrow, targeted, monitor];

  normalized.forEach((option) => {
    option.score = scoreAction(decision, option);
  });

  const sorted = normalized.sort((a, b) => b.score - a.score);
  const best = sorted[0];

  const rainText = getWeatherText(rain);
  const timeline = buildTimeline(crop, stage, best.name, rain);

  const reasoning = explainDecision(best, crop, stage, problem, rain, budget, decision);

  return {
    situation: {
      crop,
      growth_stage: stage,
      problem,
      farm_size: decision.farmSize
    },
    weather: {
      rain_probability: rain,
      rain_expected_in_hours: decision.rainExpectedInHours,
      wind_speed: decision.windSpeed,
      condition: rainText
    },
    constraints: {
      budget,
      labor: decision.labor,
      water: decision.water,
      urgency: decision.urgency
    },
    options: sorted,
    recommended_action: best.name,
    recommended_score: best.score,
    recommended_reason: reasoning,
    recommended_resource_cost: best.cost,
    bestOption: best,
    timeline,
    confidence: rain ? 'High' : 'Moderate'
  };
}

function buildTimeline(crop, stage, recommendedOption, rainProbability) {
  const rainPhrase = rainProbability >= 55 ? 'Rain expected' : 'Dry window';
  return [
    { time: 'Now', step: `Inspect affected ${crop} plants at ${stage} stage` },
    { time: 'Today', step: `Remove severely affected material and continue monitoring` },
    { time: 'Tonight', step: `${rainPhrase} may affect field operations` },
    { time: 'Tomorrow morning', step: `${recommendedOption} is the most suitable timing window` },
    { time: '48 Hours', step: 'Recheck crop condition, symptoms, and field response' }
  ];
}

function explainDecision(best, crop, stage, problem, rain, budget, decision) {
  if (best.name === 'Act immediately with treatment') {
    return `The weather window is supported enough for immediate action. ${crop} at ${stage} stage needs timely intervention for ${problem}, and current resources can support a rapid response.`;
  }

  if (best.name === 'Wait until tomorrow morning') {
    return `Rain is expected in the next few hours, so a weather-sensitive response is less suitable now. Waiting until tomorrow gives a better window while low-cost inspection and sanitation can be completed today.`;
  }

  if (best.name === 'Targeted inspection and remove affected material') {
    return `The crop situation needs a practical response with limited budget and labor. Immediate targeted sanitation reduces affected pressure without committing to a weather-sensitive treatment before rain.`;
  }

  return `The current information suggests monitoring and reassessment is the safest and most resource-efficient response. This is appropriate where urgency is moderate and weather risk is high.`;
}

function renderOptions(options) {
  const optionsGrid = document.getElementById('optionsGrid');
  optionsGrid.innerHTML = '';

  options.forEach((option, index) => {
    const card = document.createElement('article');
    card.className = 'option-card' + (index === 0 ? ' recommended' : '');

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = option.name;

    const score = document.createElement('div');
    score.className = 'score';
    score.textContent = `${option.score} / 100`;

    const lines = document.createElement('div');
    lines.className = 'chunk';
    lines.innerHTML = `<div>Cost: ${option.cost}</div><div>Weather risk: ${option.weatherRisk}</div><div>Labor: ${option.effort}</div>`;

    card.appendChild(title);
    card.appendChild(score);
    card.appendChild(lines);
    optionsGrid.appendChild(card);
  });
}

function renderTimeline(timeline) {
  const timelineList = document.getElementById('timelineList');
  timelineList.innerHTML = '';
  timeline.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'timeline-item';

    const dot = document.createElement('span');
    dot.className = 'timeline-dot';

    const content = document.createElement('div');
    const time = document.createElement('div');
    time.className = 'timeline-time';
    time.textContent = item.time;

    const step = document.createElement('div');
    step.className = 'timeline-step';
    step.textContent = item.step;

    content.appendChild(time);
    content.appendChild(step);

    row.appendChild(dot);
    row.appendChild(content);
    timelineList.appendChild(row);
  });
}

function writeSummary(decision) {
  document.getElementById('summaryCrop').textContent = decision.crop;
  document.getElementById('summaryStage').textContent = decision.growthStage;
  document.getElementById('summaryProblem').textContent = decision.problem;
  document.getElementById('summaryWeather').textContent = `${getWeatherText(decision.rainProbability)} • ${decision.rainProbability}%`;
}

function renderDecision(result) {
  const best = result.options[0];

  document.getElementById('recommendedActionTitle').textContent = result.recommended_action;
  document.getElementById('recommendedScore').textContent = `${result.recommended_score} / 100`;
  document.getElementById('recommendedReason').textContent = result.recommended_reason;
  document.getElementById('reasoningText').textContent = result.recommended_reason;
  document.getElementById('impactCost').textContent = best.cost;
  document.getElementById('impactLabor').textContent = best.effort;
  document.getElementById('impactWater').textContent = best.cost === 'Low' ? 'Low' : 'Moderate';
  document.getElementById('impactTime').textContent = '1–2 hrs';

  const weatherCondition = result.weather.rain_probability >= 55 ? 'Poor' : 'Good';
  const weatherText = result.weather.rain_probability >= 55
    ? 'Rain expected soon, immediate weather-sensitive action is less suitable'
    : 'Weather window is suitable for the recommended action';

  document.getElementById('weatherCompatibility').textContent = `Recommended option: ${result.options[0].weatherRisk === 'Low' ? 'Good' : 'Moderate'}`;
  document.getElementById('weatherSnapshot').textContent = `${result.weather.temperature}°C • ${result.weather.humidity}% humidity`;

  const confidence = result.confidence || 'High';
  const confidenceBadge = document.getElementById('confidenceBadge');
  confidenceBadge.textContent = confidence === 'High' ? 'High confidence' : 'Moderate confidence';

  renderOptions(result.options);
  renderTimeline(result.timeline);

  const whatIfResult = document.getElementById('whatIfResult');
  const changedRain = Number(document.getElementById('rainScenario').value || 70);
  if (changedRain >= 70) {
    whatIfResult.textContent = 'Rain is now more likely. The AI suggests delaying weather-sensitive action and focusing on defensive field checks.';
  } else if (changedRain <= 25) {
    whatIfResult.textContent = 'The changed rainfall window makes immediate action more suitable for weather-sensitive work and targeted field response.';
  } else {
    whatIfResult.textContent = 'The field remains suitable for a balanced response. Monitoring and planning now remain practical.';
  }
}

function runDecision() {
  const decision = getDecision();
  writeSummary(decision);
  const result = generateDecision(decision);
  renderDecision(result);
}

function useDemoScenario() {
  const cropSelect = document.getElementById('cropSelect');
  cropSelect.value = 'Tomato';

  document.getElementById('growthStage').value = 'Flowering';
  document.getElementById('farmSize').value = '2 acres';
  document.getElementById('budget').value = 'Low';
  document.getElementById('labor').value = '2 workers';
  document.getElementById('water').value = 'Limited';
  document.getElementById('urgency').value = 'high';
  document.getElementById('weatherRain').value = '70';

  const selected = document.querySelector('[data-problem].selected');
  if (selected) {
    selected.classList.remove('selected');
  }
  const cropProblem = document.querySelector('[data-problem="Possible fungal disease"]');
  cropProblem.classList.add('selected');

  runDecision();
}

function createWhatIfRecommendation() {
  const rainProb = Number(document.getElementById('rainScenario').value);
  const budget = document.getElementById('budgetScenario').value;
  const labor = document.getElementById('laborScenario').value;
  const water = document.getElementById('waterScenario').value;

  let recommendation = '';

  if (rainProb >= 60) {
    recommendation = 'The recommendation remains to wait for a safer field window and complete low-cost inspection.';
  } else if (rainProb <= 20 && budget === 'Flexible') {
    recommendation = 'The weather window is favorable and budget flexibility supports a broader intervention plan.';
  } else if (budget === 'Low') {
    recommendation = 'Budget constraints keep the recommendation focused on low-cost monitoring and sanitation.';
  } else if (labor === '8 workers') {
    recommendation = 'With more labor available, targeted inspection across a wider area becomes practical.';
  } else if (water === 'Good') {
    recommendation = 'Water availability supports more active crop management if the crop condition allows it.';
  } else {
    recommendation = 'The decision remains conservative due to weather and resource limits.';
  }

  document.getElementById('whatIfResult').textContent = recommendation;

  const decision = getDecision();
  decision.rainProbability = rainProb;
  decision.budget = budget;
  decision.labor = labor;
  decision.water = water;

  const result = generateDecision(decision);
  renderDecision(result);
}

function askCopilot(question) {
  const decision = getDecision();
  const rain = decision.rainProbability;
  const recommended = document.getElementById('recommendedActionTitle').textContent;

  const response = question.toLowerCase();

  if (response.includes('wait')) {
    return `The recommendation is to ${recommended} because rain is currently at ${rain}% probability. A weather-sensitive activity would be exposed to more risk before the expected rainfall has passed.`;
  }

  if (response.includes('act now') || response.includes('immediate')) {
    return 'Acting now would be more suitable if crop symptoms are severe and the weather window is clear. Right now, rain risk and labor/water limitations make a direct treatment less practical.';
  }

  if (response.includes('cost') || response.includes('less')) {
    return 'The lower-cost pathway is targeted inspection and removal of affected material, followed by monitoring. This avoids unnecessary treatment cost and supports a measured response.';
  }

  if (response.includes('today') || response.includes('not act')) {
    return 'If no action happens today, the crop should be monitored and severely affected material should be removed where possible. Reassess after the weather window is more suitable.';
  }

  if (response.includes('labor')) {
    return 'The current labor profile is limited to 1–2 workers. That makes low-labor monitoring and selective field sanitation more practical than broad intervention.';
  }

  if (response.includes('rain') || response.includes('weather')) {
    return 'Rain probability is now estimated at ' + rain + '%. That directly changes the suitability of weather-sensitive actions, so the recommendation prefers a safer timing window.';
  }

  return 'The current plan is to keep the response balanced: inspect immediately, avoid unnecessary weather-sensitive treatment, and reassess after the rainfall window.';
}

function initializeEvents() {
  document.querySelectorAll('[data-problem]').forEach((tile) => {
    tile.addEventListener('click', () => {
      document.querySelectorAll('[data-problem]').forEach((t) => t.classList.toggle('selected', t === tile));
      runDecision();
    });
  });

  document.getElementById('analyzeBtn').addEventListener('click', runDecision);
  document.getElementById('demoBtn').addEventListener('click', useDemoScenario);
  document.getElementById('newDecisionBtn').addEventListener('click', () => {
    document.getElementById('cropSelect').focus();
  });
  document.getElementById('whatIfBtn').addEventListener('click', () => {
    document.getElementById('rainScenario').focus();
  });

  document.getElementById('recalculateBtn').addEventListener('click', createWhatIfRecommendation);

  document.getElementById('rainScenario').addEventListener('input', () => {
    document.getElementById('rainValue').textContent = `${document.getElementById('rainScenario').value}%`;
  });

  document.getElementById('rainScenario').addEventListener('change', createWhatIfRecommendation);

  document.getElementById('budgetScenario').addEventListener('change', createWhatIfRecommendation);
  document.getElementById('laborScenario').addEventListener('change', createWhatIfRecommendation);
  document.getElementById('waterScenario').addEventListener('change', createWhatIfRecommendation);

  document.querySelectorAll('[data-question]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const answer = askCopilot(btn.dataset.question);
      document.getElementById('copilotResponse').textContent = answer;
    });
  });

  document.getElementById('askCopilotBtn').addEventListener('click', () => {
    const input = document.getElementById('copilotInput');
    const question = input.value.trim();
    if (!question) {
      return;
    }
    const answer = askCopilot(question);
    document.getElementById('copilotResponse').textContent = answer;
    input.value = '';
  });

  document.getElementById('feedbackYes').addEventListener('click', () => {
    document.getElementById('feedbackMessage').textContent = 'Feedback recorded: recommendation was useful.';
  });

  document.getElementById('feedbackNo').addEventListener('click', () => {
    document.getElementById('feedbackMessage').textContent = 'Feedback recorded: recommendation needs review.';
  });
}

function populateInitial() {
  useDemoScenario();
}

initializeEvents();
populateInitial();
