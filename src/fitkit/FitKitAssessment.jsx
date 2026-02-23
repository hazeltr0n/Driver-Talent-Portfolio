/**
 * FitKitAssessment - Main assessment wizard with state machine
 *
 * States:
 * LOADING -> INTRO -> STAGE1_MINIIP -> STAGE1_VALUES -> STAGE1_SCORING -> STAGE1_RESULTS
 *                                                                              |
 *                                                                       TRUCKING_GATE
 *                                                                        |         |
 *                                                                      PASS      FAIL
 *                                                                        |         |
 *                                                              STAGE2_FACETS    COMPLETE
 *                                                                   (24q)
 *                                                                     |
 *                                                               STAGE2_GRIT
 *                                                                   (8q)
 *                                                                     |
 *                                                            STAGE2_SCORING
 *                                                                     |
 *                                                             STAGE2_RESULTS
 *                                                                     |
 *                                                                 COMPLETE
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import QuestionCard from './QuestionCard';
import ProgressBar from './ProgressBar';
import Stage1Results from './Stage1Results';
import Stage2Results from './Stage2Results';
import {
  startAssessment,
  saveResponses,
  scoreStage1,
  scoreStage2,
} from '../lib/fitkit-api';
import './FitKit.css';

// Import item definitions
const MINI_IP_ITEMS = [
  { code: 'MINI_IP_R_1', text: 'Build kitchen cabinets', section: 'miniip' },
  { code: 'MINI_IP_R_2', text: 'Lay brick or tile', section: 'miniip' },
  { code: 'MINI_IP_R_3', text: 'Repair household appliances', section: 'miniip' },
  { code: 'MINI_IP_R_4', text: 'Raise fish in a fish hatchery', section: 'miniip' },
  { code: 'MINI_IP_R_5', text: 'Assemble electronic parts', section: 'miniip' },
  { code: 'MINI_IP_I_1', text: 'Develop a new medicine', section: 'miniip' },
  { code: 'MINI_IP_I_2', text: 'Study ways to reduce water pollution', section: 'miniip' },
  { code: 'MINI_IP_I_3', text: 'Conduct chemical experiments', section: 'miniip' },
  { code: 'MINI_IP_I_4', text: 'Study the movement of planets', section: 'miniip' },
  { code: 'MINI_IP_I_5', text: 'Examine blood samples using a microscope', section: 'miniip' },
  { code: 'MINI_IP_A_1', text: 'Write books or plays', section: 'miniip' },
  { code: 'MINI_IP_A_2', text: 'Play a musical instrument', section: 'miniip' },
  { code: 'MINI_IP_A_3', text: 'Compose or arrange music', section: 'miniip' },
  { code: 'MINI_IP_A_4', text: 'Draw pictures', section: 'miniip' },
  { code: 'MINI_IP_A_5', text: 'Create special effects for movies', section: 'miniip' },
  { code: 'MINI_IP_S_1', text: 'Teach an individual an exercise routine', section: 'miniip' },
  { code: 'MINI_IP_S_2', text: 'Help people with personal or emotional problems', section: 'miniip' },
  { code: 'MINI_IP_S_3', text: 'Give career guidance to people', section: 'miniip' },
  { code: 'MINI_IP_S_4', text: 'Perform rehabilitation therapy', section: 'miniip' },
  { code: 'MINI_IP_S_5', text: 'Help conduct a group therapy session', section: 'miniip' },
  { code: 'MINI_IP_E_1', text: 'Buy and sell stocks and bonds', section: 'miniip' },
  { code: 'MINI_IP_E_2', text: 'Manage a retail store', section: 'miniip' },
  { code: 'MINI_IP_E_3', text: 'Operate a beauty salon or barber shop', section: 'miniip' },
  { code: 'MINI_IP_E_4', text: 'Manage a department within a large company', section: 'miniip' },
  { code: 'MINI_IP_E_5', text: 'Start your own business', section: 'miniip' },
  { code: 'MINI_IP_C_1', text: 'Develop a spreadsheet using computer software', section: 'miniip' },
  { code: 'MINI_IP_C_2', text: 'Proofread records or forms', section: 'miniip' },
  { code: 'MINI_IP_C_3', text: 'Load computer software into a large computer network', section: 'miniip' },
  { code: 'MINI_IP_C_4', text: 'Operate a calculator', section: 'miniip' },
  { code: 'MINI_IP_C_5', text: 'Keep shipping and receiving records', section: 'miniip' },
];

const WORK_VALUES_ITEMS = [
  { code: 'WV_ACH_1', text: 'Having work where I could do something different every day', section: 'values' },
  { code: 'WV_ACH_2', text: 'Having work where I could see the results of my efforts', section: 'values' },
  { code: 'WV_IND_1', text: 'Having work where I could make decisions on my own', section: 'values' },
  { code: 'WV_IND_2', text: 'Having work where I could plan my work with little supervision', section: 'values' },
  { code: 'WV_REC_1', text: 'Having work where I could be "somebody" in the community', section: 'values' },
  { code: 'WV_REC_2', text: 'Having work where I could direct and instruct others', section: 'values' },
  { code: 'WV_REL_1', text: 'Having work where I could have co-workers who would be easy to get along with', section: 'values' },
  { code: 'WV_REL_2', text: 'Having work where I could be of service to others', section: 'values' },
  { code: 'WV_SUP_1', text: 'Having work where my employer would back me with fair policies', section: 'values' },
  { code: 'WV_SUP_2', text: 'Having work where I could have steady employment', section: 'values' },
  { code: 'WV_WC_1', text: 'Having work where I could be paid well compared to other workers', section: 'values' },
  { code: 'WV_WC_2', text: 'Having work where I could have good working conditions', section: 'values' },
];

const FACET_ITEMS = [
  { code: 'FACET_EMP_1', text: "I sympathize with others' feelings", section: 'facets' },
  { code: 'FACET_EMP_2', text: "I feel others' emotions", section: 'facets' },
  { code: 'FACET_EMP_3', text: 'I am concerned about others', section: 'facets' },
  { code: 'FACET_EMP_4', text: 'I take time to help others', section: 'facets' },
  { code: 'FACET_ANX_1', text: 'I worry about things', section: 'facets' },
  { code: 'FACET_ANX_2', text: 'I am easily disturbed', section: 'facets' },
  { code: 'FACET_ANX_3', text: 'I get stressed out easily', section: 'facets' },
  { code: 'FACET_ANX_4', text: 'I am relaxed most of the time', section: 'facets' },
  { code: 'FACET_EXC_1', text: 'I love excitement', section: 'facets' },
  { code: 'FACET_EXC_2', text: 'I seek adventure', section: 'facets' },
  { code: 'FACET_EXC_3', text: 'I enjoy being reckless', section: 'facets' },
  { code: 'FACET_EXC_4', text: 'I act wild and crazy', section: 'facets' },
  { code: 'FACET_DIS_1', text: 'I get chores done right away', section: 'facets' },
  { code: 'FACET_DIS_2', text: 'I am always prepared', section: 'facets' },
  { code: 'FACET_DIS_3', text: 'I carry out my plans', section: 'facets' },
  { code: 'FACET_DIS_4', text: 'I waste my time', section: 'facets' },
  { code: 'FACET_IMM_1', text: 'I often eat too much', section: 'facets' },
  { code: 'FACET_IMM_2', text: 'I go on binges', section: 'facets' },
  { code: 'FACET_IMM_3', text: 'I rarely overindulge', section: 'facets' },
  { code: 'FACET_IMM_4', text: 'I easily resist temptations', section: 'facets' },
  { code: 'FACET_DUT_1', text: 'I keep my promises', section: 'facets' },
  { code: 'FACET_DUT_2', text: 'I follow through on my commitments', section: 'facets' },
  { code: 'FACET_DUT_3', text: 'I tell the truth', section: 'facets' },
  { code: 'FACET_DUT_4', text: 'I break rules', section: 'facets' },
];

const GRIT_ITEMS = [
  { code: 'GRIT_CI_1', text: 'New ideas and projects sometimes distract me from previous ones', section: 'grit' },
  { code: 'GRIT_CI_2', text: "Setbacks don't discourage me", section: 'grit' },
  { code: 'GRIT_CI_3', text: 'I have been obsessed with a certain idea or project for a short time but later lost interest', section: 'grit' },
  { code: 'GRIT_CI_4', text: 'I am a hard worker', section: 'grit' },
  { code: 'GRIT_PE_1', text: 'I often set a goal but later choose to pursue a different one', section: 'grit' },
  { code: 'GRIT_PE_2', text: 'I have difficulty maintaining my focus on projects that take more than a few months to complete', section: 'grit' },
  { code: 'GRIT_PE_3', text: 'I finish whatever I begin', section: 'grit' },
  { code: 'GRIT_PE_4', text: 'I am diligent', section: 'grit' },
];

const SCALES = {
  miniip: [
    { value: 1, label: 'Strongly Dislike' },
    { value: 2, label: 'Dislike' },
    { value: 3, label: 'Neutral' },
    { value: 4, label: 'Like' },
    { value: 5, label: 'Strongly Like' },
  ],
  values: [
    { value: 1, label: 'Not Important' },
    { value: 2, label: 'Slightly' },
    { value: 3, label: 'Moderate' },
    { value: 4, label: 'Very' },
    { value: 5, label: 'Extremely' },
  ],
  facets: [
    { value: 1, label: 'Very Inaccurate' },
    { value: 2, label: 'Inaccurate' },
    { value: 3, label: 'Neither' },
    { value: 4, label: 'Accurate' },
    { value: 5, label: 'Very Accurate' },
  ],
  grit: [
    { value: 1, label: 'Not Like Me' },
    { value: 2, label: 'A Little' },
    { value: 3, label: 'Somewhat' },
    { value: 4, label: 'Mostly' },
    { value: 5, label: 'Very Much' },
  ],
};

const SECTION_INFO = {
  miniip: {
    title: 'Work Activities',
    subtitle: 'How much would you enjoy doing these activities?',
    instruction: 'Rate each activity regardless of experience',
  },
  values: {
    title: 'Work Values',
    subtitle: 'What matters to you in a job?',
    instruction: 'Rate how important each is to you',
  },
  facets: {
    title: 'About You',
    subtitle: 'How accurately do these describe you?',
    instruction: 'Be honest - there are no wrong answers',
  },
  grit: {
    title: 'Persistence',
    subtitle: 'How well do these describe you?',
    instruction: 'Think about how you typically act',
  },
};

// State machine states
const STATES = {
  LOADING: 'LOADING',
  ERROR: 'ERROR',
  INTRO: 'INTRO',
  STAGE1_MINIIP: 'STAGE1_MINIIP',
  STAGE1_VALUES: 'STAGE1_VALUES',
  STAGE1_SCORING: 'STAGE1_SCORING',
  STAGE1_RESULTS: 'STAGE1_RESULTS',
  STAGE2_FACETS: 'STAGE2_FACETS',
  STAGE2_GRIT: 'STAGE2_GRIT',
  STAGE2_SCORING: 'STAGE2_SCORING',
  STAGE2_RESULTS: 'STAGE2_RESULTS',
  COMPLETE: 'COMPLETE',
};

export default function FitKitAssessment({ uuid }) {
  const [state, setState] = useState(STATES.LOADING);
  const [error, setError] = useState(null);
  const [responses, setResponses] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stage1Results, setStage1Results] = useState(null);
  const [stage2Results, setStage2Results] = useState(null);

  // Get current section's items
  const currentItems = useMemo(() => {
    switch (state) {
      case STATES.STAGE1_MINIIP:
        return MINI_IP_ITEMS;
      case STATES.STAGE1_VALUES:
        return WORK_VALUES_ITEMS;
      case STATES.STAGE2_FACETS:
        return FACET_ITEMS;
      case STATES.STAGE2_GRIT:
        return GRIT_ITEMS;
      default:
        return [];
    }
  }, [state]);

  const currentSection = useMemo(() => {
    switch (state) {
      case STATES.STAGE1_MINIIP:
        return 'miniip';
      case STATES.STAGE1_VALUES:
        return 'values';
      case STATES.STAGE2_FACETS:
        return 'facets';
      case STATES.STAGE2_GRIT:
        return 'grit';
      default:
        return null;
    }
  }, [state]);

  const currentQuestion = currentItems[currentIndex];
  const answeredCount = currentItems.filter((item) => responses[item.code] !== undefined).length;
  const allAnswered = answeredCount === currentItems.length;

  // Initialize assessment
  useEffect(() => {
    if (!uuid) {
      setError('No assessment ID provided');
      setState(STATES.ERROR);
      return;
    }

    startAssessment(uuid)
      .then((data) => {
        // Restore responses if resuming
        if (data.stage1Responses) {
          setResponses((prev) => ({ ...prev, ...data.stage1Responses }));
        }
        if (data.stage2Responses) {
          setResponses((prev) => ({ ...prev, ...data.stage2Responses }));
        }

        // Determine starting state
        if (data.stage2Completed) {
          setState(STATES.COMPLETE);
        } else if (data.stage1Completed) {
          setState(STATES.STAGE2_FACETS);
        } else {
          setState(STATES.INTRO);
        }
      })
      .catch((err) => {
        setError(err.message);
        setState(STATES.ERROR);
      });
  }, [uuid]);

  // Save responses periodically
  const saveProgress = useCallback(async () => {
    const stage = state.startsWith('STAGE1') ? 1 : 2;
    const stageResponses = {};
    const prefix = stage === 1 ? ['MINI_IP', 'WV'] : ['FACET', 'GRIT'];

    for (const [code, value] of Object.entries(responses)) {
      if (prefix.some((p) => code.startsWith(p))) {
        stageResponses[code] = value;
      }
    }

    if (Object.keys(stageResponses).length > 0) {
      await saveResponses(uuid, stage, stageResponses);
    }
  }, [uuid, state, responses]);

  // Handle response
  const handleResponse = useCallback(
    (value) => {
      const code = currentQuestion.code;
      setResponses((prev) => ({ ...prev, [code]: value }));

      // Auto-advance to next question
      if (currentIndex < currentItems.length - 1) {
        setTimeout(() => setCurrentIndex(currentIndex + 1), 300);
      }
    },
    [currentQuestion, currentIndex, currentItems.length]
  );

  // Navigate to previous question
  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  // Navigate to next section or score
  const handleNext = useCallback(async () => {
    // Save current progress
    await saveProgress();

    switch (state) {
      case STATES.STAGE1_MINIIP:
        setCurrentIndex(0);
        setState(STATES.STAGE1_VALUES);
        break;

      case STATES.STAGE1_VALUES:
        setState(STATES.STAGE1_SCORING);
        try {
          const results = await scoreStage1(uuid);
          setStage1Results(results);
          setState(STATES.STAGE1_RESULTS);
        } catch (err) {
          setError(err.message);
          setState(STATES.ERROR);
        }
        break;

      case STATES.STAGE2_FACETS:
        setCurrentIndex(0);
        setState(STATES.STAGE2_GRIT);
        break;

      case STATES.STAGE2_GRIT:
        setState(STATES.STAGE2_SCORING);
        try {
          const results = await scoreStage2(uuid);
          setStage2Results(results);
          setState(STATES.STAGE2_RESULTS);
        } catch (err) {
          setError(err.message);
          setState(STATES.ERROR);
        }
        break;

      default:
        break;
    }
  }, [state, uuid, saveProgress]);

  // Handle Stage 1 results continue
  const handleStage1Continue = useCallback(() => {
    setCurrentIndex(0);
    setState(STATES.STAGE2_FACETS);
  }, []);

  // Handle explore alternatives
  const handleExploreAlternatives = useCallback(() => {
    // For now, just complete - could show alternative careers screen
    setState(STATES.COMPLETE);
  }, []);

  // Handle Stage 2 complete
  const handleStage2Complete = useCallback(() => {
    setState(STATES.COMPLETE);
  }, []);

  // Render based on state
  if (state === STATES.LOADING || state === STATES.STAGE1_SCORING || state === STATES.STAGE2_SCORING) {
    return (
      <div className="fitkit">
        <div className="fitkit-header">
          <img src="/fw-logo-white.svg" alt="FreeWorld" />
          <span className="fitkit-header-title">FitKit</span>
        </div>
        <div className="fitkit-main">
          <div className="fitkit-loading">
            <div className="fitkit-spinner" />
            <p className="fitkit-loading-text">
              {state === STATES.LOADING && 'Loading assessment...'}
              {state === STATES.STAGE1_SCORING && 'Analyzing your interests...'}
              {state === STATES.STAGE2_SCORING && 'Calculating your trucking fit...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (state === STATES.ERROR) {
    return (
      <div className="fitkit">
        <div className="fitkit-header">
          <img src="/fw-logo-white.svg" alt="FreeWorld" />
          <span className="fitkit-header-title">FitKit</span>
        </div>
        <div className="fitkit-main">
          <div className="fitkit-error">
            <h2 className="fitkit-error-title">Error</h2>
            <p className="fitkit-error-message">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (state === STATES.INTRO) {
    return (
      <div className="fitkit">
        <div className="fitkit-header">
          <img src="/fw-logo-white.svg" alt="FreeWorld" />
          <span className="fitkit-header-title">FitKit</span>
        </div>
        <div className="fitkit-main">
          <div className="fitkit-intro">
            <img src="/fw-logo-white.svg" alt="FreeWorld" className="fitkit-intro-logo" />
            <h1 className="fitkit-intro-title">Discover Your Career Fit</h1>
            <p className="fitkit-intro-subtitle">
              This assessment helps you understand your interests, values, and strengths
              to find careers where you'll thrive.
            </p>

            <div className="fitkit-intro-features">
              <div className="fitkit-intro-feature">
                <div className="fitkit-intro-feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div>
                  <h3>Career Compass</h3>
                  <p>Discover which careers match your interests and values</p>
                </div>
              </div>
              <div className="fitkit-intro-feature">
                <div className="fitkit-intro-feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <h3>Trucking Fit</h3>
                  <p>See how well you match trucking career demands</p>
                </div>
              </div>
            </div>

            <p className="fitkit-intro-time">Takes about 10-15 minutes</p>

            <button
              className="fitkit-btn fitkit-btn-primary"
              onClick={() => {
                setCurrentIndex(0);
                setState(STATES.STAGE1_MINIIP);
              }}
            >
              Start Assessment
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state === STATES.STAGE1_RESULTS && stage1Results) {
    return (
      <div className="fitkit">
        <div className="fitkit-header">
          <img src="/fw-logo-white.svg" alt="FreeWorld" />
          <span className="fitkit-header-title">FitKit</span>
        </div>
        <div className="fitkit-main">
          <Stage1Results
            results={stage1Results}
            onContinue={handleStage1Continue}
            onExploreAlternatives={handleExploreAlternatives}
          />
        </div>
      </div>
    );
  }

  if (state === STATES.STAGE2_RESULTS && stage2Results) {
    return (
      <div className="fitkit">
        <div className="fitkit-header">
          <img src="/fw-logo-white.svg" alt="FreeWorld" />
          <span className="fitkit-header-title">FitKit</span>
        </div>
        <div className="fitkit-main">
          <Stage2Results results={stage2Results} onComplete={handleStage2Complete} />
        </div>
      </div>
    );
  }

  if (state === STATES.COMPLETE) {
    return (
      <div className="fitkit">
        <div className="fitkit-header">
          <img src="/fw-logo-white.svg" alt="FreeWorld" />
          <span className="fitkit-header-title">FitKit</span>
        </div>
        <div className="fitkit-main">
          <div className="fitkit-complete">
            <div className="fitkit-complete-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="fitkit-complete-title">Assessment Complete!</h1>
            <p className="fitkit-complete-message">
              Your results have been saved to your profile. Your Career Agent will
              review them and reach out with personalized guidance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Question-answering states
  const sectionInfo = SECTION_INFO[currentSection];
  const scale = SCALES[currentSection];

  return (
    <div className="fitkit">
      <div className="fitkit-header">
        <img src="/fw-logo-white.svg" alt="FreeWorld" />
        <span className="fitkit-header-title">FitKit</span>
      </div>

      <div className="fitkit-main">
        <ProgressBar
          current={answeredCount}
          total={currentItems.length}
          label={sectionInfo.title}
        />

        <div className="fitkit-section-header">
          <h1 className="fitkit-section-title">{sectionInfo.title}</h1>
          <p className="fitkit-section-subtitle">{sectionInfo.subtitle}</p>
          <p className="fitkit-section-instruction">{sectionInfo.instruction}</p>
        </div>

        {currentQuestion && (
          <QuestionCard
            question={currentQuestion}
            scale={scale}
            value={responses[currentQuestion.code]}
            onChange={handleResponse}
          />
        )}

        <div className="fitkit-nav">
          <button
            className="fitkit-btn fitkit-btn-secondary"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            Previous
          </button>
          <button
            className="fitkit-btn fitkit-btn-primary"
            onClick={handleNext}
            disabled={!allAnswered}
          >
            {allAnswered ? 'Continue' : `${currentItems.length - answeredCount} left`}
          </button>
        </div>
      </div>
    </div>
  );
}
