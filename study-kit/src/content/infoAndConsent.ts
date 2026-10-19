// ============================================================================
// Participant Information Sheets and Consent Forms – SINGLE SOURCE OF TRUTH.
// Generated from "3a/3b Participant Information Sheet" and "4a/4b Consent Form"
// (.docx, 19 Oct 2026). If ethics changes the wording, edit it HERE and bump
// the `version` – the version is saved with every participant's consent
// record, so you always know exactly which wording each person agreed to.
//
// Formatting inside text: **bold**, and bare https:// links become clickable.
// `live` = main study (Prolific). `pilot` = piloting sessions.
// ============================================================================

export interface DocBlock {
  kind: 'p' | 'ul' | 'ol';
  text?: string;
  items?: string[];
}

export interface InfoSheet {
  version: string;
  title: string;
  subtitle: string;
  intro: DocBlock[];
  sections: { heading: string; blocks: DocBlock[] }[];
}

export interface ConsentForm {
  version: string;
  projectTitle: string;
  srecReference: string; // fill in once ethics approves
  leadResearcher: string;
  /** One tick box per statement; all must be ticked to continue. Keep ids
   * stable (c1, c2, …) – they're the keys stored in the consent record. */
  statements: { id: string; text: string }[];
}

export type StudyMode = 'live' | 'pilot' | 'test';

const LIVE_SHEET: InfoSheet = {
  version: 'main-1.0 (13 Oct 2026)',
  title: "Participant Information Sheet",
  subtitle: "Using Serious Games to Improve Public Comprehension of Utility Frameworks (Main Study)",
  intro: [
  {
    "kind": "p",
    "text": "You are being invited to take part in a research project. Before you decide whether or not to take part, it is important for you to understand why the research is being undertaken and what it will involve. Please take time to read the following information carefully and discuss it with others, if you wish."
  },
  {
    "kind": "p",
    "text": "Thank you for reading this."
  }
],
  sections: [
  {
    "heading": "What is the purpose of this research project?",
    "blocks": [
      {
        "kind": "p",
        "text": "This project aims to evaluate whether an interactive serious game can improve public comprehension of alternatives to governmental policymaking methods compared to a traditional reading-based control. It also asks which approach participants think is most appropriate for government decisions, and whether there are policy areas where wellbeing trade-offs should not apply."
      }
    ]
  },
  {
    "heading": "Why have I been invited to take part?",
    "blocks": [
      {
        "kind": "p",
        "text": "You have been invited because you responded to an advertisement on an online research platform (such as Prolific). To take part, you must be a UK resident aged 18 or over and fluent in English. You also need access to a desktop or laptop computer. You cannot take part if you took part in the pilot of this study."
      }
    ]
  },
  {
    "heading": "Do I have to take part?",
    "blocks": [
      {
        "kind": "p",
        "text": "No. Your participation is entirely voluntary. You will be asked to complete a digital consent form before entering the study. You are free to withdraw at any point during the study simply by closing your browser window."
      },
      {
        "kind": "p",
        "text": "If you close your browser before finishing, any responses you have already given may still be used in the study unless you ask us to remove them. You can ask for your data to be removed within [14] days of taking part by contacting the Lead Researcher with your Platform ID. After that, the link between your Platform ID and your responses is deleted, so your data can no longer be identified or withdrawn."
      }
    ]
  },
  {
    "heading": "What will taking part involve?",
    "blocks": [
      {
        "kind": "p",
        "text": "This is an online study completed in one sitting, taking about 40–55 minutes:"
      },
      {
        "kind": "p",
        "text": "**Background questions (about 5 minutes):** after giving consent, you will answer some background questions (such as your age, occupation, political leaning and how satisfied you are with your life) and a few short questions about reading charts and simple numbers. You can skip any background question you would prefer not to answer."
      },
      {
        "kind": "p",
        "text": "**Main task (about 35–50 minutes):** you will be randomly assigned (like flipping a coin) to either play an interactive web-based policy game or read a short online guide covering the same topics. Some people take longer than others, particularly with the game, which is fine – please work at your own pace. Afterwards, you will answer questions about the topics and your experience."
      },
      {
        "kind": "p",
        "text": "**Technical Requirement:** This study must be completed on a desktop or laptop computer (screen width of at least 1024x600 resolution). Mobile phones and tablets are not supported."
      }
    ]
  },
  {
    "heading": "Will I be paid for taking part?",
    "blocks": [
      {
        "kind": "p",
        "text": "Yes. You will receive at least £10 for completing the study, paid via the recruitment platform or as an electronic voucher. Everyone is paid the same, whichever group you are in and however long the task takes you."
      }
    ]
  },
  {
    "heading": "What are the possible benefits of taking part?",
    "blocks": [
      {
        "kind": "p",
        "text": "There are no direct personal benefits. However, your contribution will help researchers understand how serious games can improve public understanding of alternative policymaking methods."
      }
    ]
  },
  {
    "heading": "What are the possible risks of taking part?",
    "blocks": [
      {
        "kind": "p",
        "text": "There are no anticipated physical risks, and psychological risks are minimal. One question asks how satisfied you are with your life; you can skip it if you prefer."
      }
    ]
  },
  {
    "heading": "Will my taking part in this research project be kept confidential?",
    "blocks": [
      {
        "kind": "p",
        "text": "All information collected will be kept strictly confidential. Your responses and gameplay telemetry are anonymised. Your Platform ID is collected only to verify study completion and process payment. It is stored with your responses only until payment has been processed and the withdrawal period has ended; it is then removed from your responses and kept separately as a record of consent."
      }
    ]
  },
  {
    "heading": "What will happen to my Personal Data?",
    "blocks": [
      {
        "kind": "p",
        "text": "By participating, you will provide your Platform ID, demographic data (age, income, occupation, sex/gender, political leaning) and your self-reported life satisfaction. If you are paid by electronic voucher, we will also ask for your email address, solely to send it. Your email address will be stored separately from your responses and deleted once the voucher has been sent. All personal data will be anonymised."
      },
      {
        "kind": "p",
        "text": "Cardiff University is the Data Controller for this project and is committed to respecting and protecting your Personal Data in accordance with your expectations and Data Protection legislation. Further information about Data Protection, including:"
      },
      {
        "kind": "ul",
        "items": [
          "your rights",
          "the University’s Data Protection Policy and broad data management principles; and",
          "how to contact the University’s Data Protection Officer and/or the Information Commissioner’s Office"
        ]
      },
      {
        "kind": "p",
        "text": "can be found at https://www.cardiff.ac.uk/public-information/policies-and-procedures/data-protection. The University’s overarching Data Protection Notice for research participants is available at https://www.cardiff.ac.uk/public-information/policies-and-procedures/data-protection/research-participants-data-protection-notice. If you do not have access to the internet and/or otherwise require this information in another format, please let us know."
      },
      {
        "kind": "p",
        "text": "In accordance with Data Protection legislation, we are required to inform you of our lawful basis for collecting and processing your Personal Data. The lawful basis we are relying on as part of the research project is article 6(1)(e) of the UK GDPR, namely that the processing of your Personal Data is necessary for the performance of our public task."
      },
      {
        "kind": "p",
        "text": "This project also involves the collection and processing of some sensitive (‘special category’) data, namely political leaning. Our condition for processing your special category data is article 9(2)(j), namely that this is necessary for archiving purposes in the public interest, scientific or statistical purposes."
      },
      {
        "kind": "p",
        "text": "Cardiff University will share your Platform ID with the recruitment platform, solely to verify task completion and process your payment. If you are paid by electronic voucher, your email address may be shared with the voucher provider, solely to send your voucher. No other Personal Data will be shared with any third party, except where required as part of a research integrity investigation (for example, to verify that study data has not been fabricated)."
      },
      {
        "kind": "p",
        "text": "After payment is processed and the withdrawal period has ended, the link between your Platform ID and your responses is deleted and all remaining data is fully anonymised. Your Platform ID is retained separately in our research data store as a record of your consent for a minimum of 5 years after the end of the project or publication of findings arising from it, whichever is later, in accordance with Section 2.9 (Research Project Conduct) of the University's Research Records Retention Schedule, and may be accessed by members of the research team and, where necessary, by members of the University's governance and audit teams or by regulatory authorities."
      }
    ]
  },
  {
    "heading": "What happens to the data and results at the end of the research project?",
    "blocks": [
      {
        "kind": "p",
        "text": "Fully anonymised quantitative scores, telemetry data, and survey responses will be retained indefinitely in an open-access academic repository to support a PhD thesis, journal publications, and future research. Individual participants will never be identified in any publication."
      },
      {
        "kind": "p",
        "text": "All de-identified data and information will be kept for a minimum of 5 years after the end of the project or publication of findings arising from it, whichever is later, in accordance with the University's Research Records Retention Schedule. We intend to release this anonymised data into the public domain (for example, via an open-access data repository), where it may be retained indefinitely and used for purposes beyond this project."
      },
      {
        "kind": "p",
        "text": "It is our intention to publish the results of this research project in academic journals, present findings at conferences, and include them in my PhD thesis. We expect results to be available within approximately 12–18 months of the study's completion. If you would like a summary of the findings once available, you may request one by contacting the Lead Researcher (see contact details below). As data collection is anonymised, we will not be able to tell you individually which study condition (game or reading control) you were assigned to."
      },
      {
        "kind": "p",
        "text": "Participants will not be identified in any write-up, report, publication or presentation arising from this project."
      },
      {
        "kind": "p",
        "text": "There is intention to use verbatim quotes from participants in any subsequent write-up, report or publication, though participants will not be identifiable from such quotes."
      }
    ]
  },
  {
    "heading": "What if there is a problem?",
    "blocks": [
      {
        "kind": "p",
        "text": "If you have any concerns or complaints, please contact Harry Franklin in the first instance. If your concern is not managed to your satisfaction, please contact the Cardiff University School of Computational and Mathematical Sciences Research Ethics Committee (comat-ethics@cardiff.ac.uk)"
      },
      {
        "kind": "p",
        "text": "If you are harmed by taking part in this research project, there are no special compensation arrangements. If you are harmed due to someone's negligence, you may have grounds for legal action, but you may have to pay for it."
      }
    ]
  },
  {
    "heading": "Who is leading and funding this research project?",
    "blocks": [
      {
        "kind": "p",
        "text": "The research is led by Harry Franklin (School of Computational and Mathematical Sciences, Cardiff University). The PhD research is funded via an internal School Studentship."
      },
      {
        "kind": "p",
        "text": "Cardiff University is committed to protecting the safety, rights and dignity of research participants and insists that all research conducted by its staff and students is underpinned by the highest ethical standards. Further information about Research Ethics and Research Integrity (good research practice) at Cardiff University can be found at https://www.cardiff.ac.uk/research/our-research-environment/integrity-and-ethics."
      }
    ]
  },
  {
    "heading": "Who has reviewed this research project?",
    "blocks": [
      {
        "kind": "p",
        "text": "This research project has been reviewed and granted a favourable ethical opinion by the School of Computational and Mathematical Sciences Research Ethics Committee, Cardiff University."
      }
    ]
  },
  {
    "heading": "Further information and contact details",
    "blocks": [
      {
        "kind": "p",
        "text": "Should you have any questions relating to this research project, you may contact me using the details below:"
      },
      {
        "kind": "p",
        "text": "**Lead Researcher:** Harry Franklin (FranklinH@cardiff.ac.uk)"
      },
      {
        "kind": "p",
        "text": "**Location:** Abacws, Room 2.36, Senghennydd Road, Cathays, Cardiff, CF24 4AG"
      },
      {
        "kind": "p",
        "text": "**Thank you for considering taking part in this research project. If you decide to participate, you will be given a copy of the Participant Information Sheet and a record of your consent to keep for your records.**"
      }
    ]
  }
],
};

const PILOT_SHEET: InfoSheet = {
  version: 'pilot-1.0 (13 Oct 2026)',
  title: "Participant Information Sheet",
  subtitle: "Using Serious Games to Improve Public Comprehension of Utility Frameworks (Usability, Playtesting & Instrument Piloting)",
  intro: [
  {
    "kind": "p",
    "text": "You are being invited to take part in a research project. Before you decide whether or not to take part, it is important for you to understand why the research is being undertaken and what it will involve. Please take time to read the following information carefully and discuss it with others, if you wish."
  },
  {
    "kind": "p",
    "text": "Thank you for reading this."
  }
],
  sections: [
  {
    "heading": "What is the purpose of this research project?",
    "blocks": [
      {
        "kind": "p",
        "text": "This project aims to evaluate both the software design of an interactive serious game and the effectiveness of its accompanying research instruments. The specific purpose of this study is twofold:"
      },
      {
        "kind": "ol",
        "items": [
          "To playtest and evaluate the game’s user interface, visual layout and gameplay mechanics, and the reading-based materials used in the study’s comparison group.",
          "To pilot and evaluate draft survey items, assessment tasks, and study materials to ensure they are clear, accessible, and accurately measure conceptual understanding before deployment in a larger study."
        ]
      }
    ]
  },
  {
    "heading": "Why have I been invited to take part?",
    "blocks": [
      {
        "kind": "p",
        "text": "You have been invited because you are a Cardiff University staff member or student, a colleague, a member of an academic reading group, or someone in the researcher’s wider personal or professional network."
      }
    ]
  },
  {
    "heading": "Do I have to take part?",
    "blocks": [
      {
        "kind": "p",
        "text": "No. Your participation is entirely voluntary. If you decide to take part, you will be provided with this information sheet and asked to sign a consent form. You do not have to give a reason if you decide not to participate, and it will not affect your legal rights, employment, academic standing, course progression, or your relationship with the researcher."
      },
      {
        "kind": "p",
        "text": "You are free to withdraw your consent and stop participating at any time during the session without giving a reason. If you choose to withdraw, any identifiable contact details or notes collected up to that point will be destroyed. However, notes will be anonymised immediately after the end of the usability and playtesting session."
      }
    ]
  },
  {
    "heading": "What will taking part involve?",
    "blocks": [
      {
        "kind": "p",
        "text": "Taking part involves one one-to-one session with the researcher, either in person at Cardiff University or online via Microsoft Teams, whichever suits you."
      },
      {
        "kind": "ul",
        "items": [
          "**Pilot the game and/or reading materials:** play a prototype of the game, read the text-based guide used for the study’s comparison group, or both, and point out anything confusing or hard to use.",
          "**Pilot the questionnaires:** complete draft versions of the baseline and post-task questions and comment on their wording, clarity and length. Your answers are used only to improve the questions and are not analysed as study data.",
          "**Give feedback:** a short informal chat about what did and didn’t work."
        ]
      },
      {
        "kind": "p",
        "text": "The total session will take approximately **45-60 minutes.**"
      }
    ]
  },
  {
    "heading": "Will I be paid for taking part?",
    "blocks": [
      {
        "kind": "p",
        "text": "No."
      }
    ]
  },
  {
    "heading": "What are the possible benefits of taking part?",
    "blocks": [
      {
        "kind": "p",
        "text": "There are no direct personal benefits. However, your feedback will aid the development and refinement of the study’s content and instruments, and participant experience prior to the start of the main research study."
      }
    ]
  },
  {
    "heading": "What are the possible risks of taking part?",
    "blocks": [
      {
        "kind": "p",
        "text": "There are no anticipated physical, psychological, or emotional risks associated with taking part."
      }
    ]
  },
  {
    "heading": "Will my taking part in this research project be kept confidential?",
    "blocks": [
      {
        "kind": "p",
        "text": "All information collected from or about you will be kept strictly confidential, unless exceptional circumstances require disclosure by law. Any personal data (such as your name and contact details used for scheduling) will be stored on secure, password-protected Cardiff University servers, completely separate from the feedback data."
      }
    ]
  },
  {
    "heading": "What will happen to my Personal Data?",
    "blocks": [
      {
        "kind": "p",
        "text": "By participating in this, you will provide minimal Personal Data, specifically your name and contact details strictly necessary for scheduling sessions and recording consent."
      },
      {
        "kind": "p",
        "text": "Cardiff University is the Data Controller for this project and is committed to respecting and protecting your Personal Data in accordance with your expectations and Data Protection legislation. Further information about Data Protection, including:"
      },
      {
        "kind": "ul",
        "items": [
          "your rights",
          "the University’s Data Protection Policy and broad data management principles; and",
          "how to contact the University’s Data Protection Officer and/or the Information Commissioner’s Office"
        ]
      },
      {
        "kind": "p",
        "text": "can be found at https://www.cardiff.ac.uk/public-information/policies-and-procedures/data-protection. The University’s overarching Data Protection Notice for research participants is available at https://www.cardiff.ac.uk/public-information/policies-and-procedures/data-protection/research-participants-data-protection-notice. If you do not have access to the internet and/or otherwise require this information in another format, please let us know."
      },
      {
        "kind": "p",
        "text": "In accordance with Data Protection legislation, we are required to inform you of our lawful basis for collecting and processing your Personal Data. The lawful basis we are relying on as part of the research project is article 6(1)(e) of the UK GDPR, namely that the processing of your Personal Data is necessary for the performance of our public task.."
      },
      {
        "kind": "p",
        "text": "Immediately after the session, the research team will de-identify the Personal Data it has collected from, or about, you in connection with this research project, with the exception of your consent form, which contains your full name. Your consent form will be retained securely for a minimum of 5 years after the end of the project or publication of findings arising from it, whichever is later, in accordance with Section 2.9 (Research Project Conduct) of the University's Research Records Retention Schedule, and may be accessed by members of the research team and, where necessary, by members of the University's governance and audit teams or by regulatory authorities."
      },
      {
        "kind": "p",
        "text": "As referenced in Section 3 above, if you choose to withdraw from this project, all data collected as part of the study up until your withdrawal will be deleted."
      }
    ]
  },
  {
    "heading": "What happens to the data and results at the end of the research project?",
    "blocks": [
      {
        "kind": "p",
        "text": "Anonymised qualitative feedback and observational notes will be retained to support the iterative development of the game and study instruments, a PhD thesis, academic publications, and conference presentations. You will not be identified in any publication. Anonymous verbatim quotes from your feedback may be used in academic reporting."
      },
      {
        "kind": "p",
        "text": "All de-identified data and information will be kept for a minimum of 5 years after the end of the project or publication of findings arising from it, whichever is later, in accordance with the University's Research Records Retention Schedule. We intend to release this anonymised data into the public domain (for example, via an open-access data repository), where it may be retained indefinitely and used for purposes beyond this project."
      },
      {
        "kind": "p",
        "text": "It is our intention to publish the results of this research project in academic journals, present findings at conferences, and include them in my PhD thesis. We expect results to be available within approximately 12–18 months of the study's completion. If you would like a summary of the findings once available, you may request one by contacting the Lead Researcher (see contact details below)."
      },
      {
        "kind": "p",
        "text": "Participants will not be identified in any write-up, report, publication or presentation arising from this project."
      },
      {
        "kind": "p",
        "text": "It is intended that verbatim quotes from participants will be used in any subsequent write-up, report or publication, though participants will not be identifiable from such."
      }
    ]
  },
  {
    "heading": "What if there is a problem?",
    "blocks": [
      {
        "kind": "p",
        "text": "If you have any concerns or complaints, please contact Harry Franklin in the first instance. If your concern is not managed to your satisfaction, please contact the Cardiff University School of Computational and Mathematical Sciences Research Ethics Committee (comat-ethics@cardiff.ac.uk)"
      },
      {
        "kind": "p",
        "text": "If you are harmed by taking part in this research project, there are no special compensation arrangements. If you are harmed due to someone's negligence, you may have grounds for legal action, but you may have to pay for it."
      }
    ]
  },
  {
    "heading": "Who is leading and funding this research project?",
    "blocks": [
      {
        "kind": "p",
        "text": "The research is led by Harry Franklin (School of Computational and Mathematical Sciences, Cardiff University). The PhD research is funded via an internal School Studentship."
      },
      {
        "kind": "p",
        "text": "Cardiff University is committed to protecting the safety, rights and dignity of research participants and insists that all research conducted by its staff and students is underpinned by the highest ethical standards. Further information about Research Ethics and Research Integrity (good research practice) at Cardiff University can be found at https://www.cardiff.ac.uk/research/our-research-environment/integrity-and-ethics."
      }
    ]
  },
  {
    "heading": "Who has reviewed this research project?",
    "blocks": [
      {
        "kind": "p",
        "text": "This research project has been reviewed and granted a favourable ethical opinion by the School of Computational and Mathematical Sciences Research Ethics Committee, Cardiff University."
      }
    ]
  },
  {
    "heading": "Further information and contact details",
    "blocks": [
      {
        "kind": "p",
        "text": "Should you have any questions relating to this research project, you may contact me using the details below:"
      },
      {
        "kind": "p",
        "text": "**Lead Researcher:** Harry Franklin (FranklinH@cardiff.ac.uk)"
      },
      {
        "kind": "p",
        "text": "**Location:** Abacws, Room 2.36, Senghennydd Road, Cathays, Cardiff, CF24 4AG"
      },
      {
        "kind": "p",
        "text": "**Thank you for considering taking part in this research project. If you decide to participate, you will be given a copy of the Participant Information Sheet and a record of your consent to keep for your records.**"
      }
    ]
  }
],
};

const LIVE_CONSENT: ConsentForm = {
  version: 'main-1.0 (13 Oct 2026)',
  projectTitle: 'Using Serious Games to Improve Public Comprehension of Utility Frameworks',
  srecReference: '',
  leadResearcher: 'Harry Franklin',
  statements: [
  {
    "id": "c1",
    "text": "I confirm that I have read the information sheet dated 13th October 2026 version 1.0 for the above research project."
  },
  {
    "id": "c2",
    "text": "I confirm that I have understood the information sheet dated 13th October 2026 version 1.0 for the above research project and that I have had the opportunity to ask questions and that these have been answered satisfactorily."
  },
  {
    "id": "c3",
    "text": "I understand that my participation is voluntary and I am free to withdraw at any time without giving a reason and without any adverse consequences. I understand that responses I have already given may still be used unless I ask for them to be removed within [14] days of taking part."
  },
  {
    "id": "c4",
    "text": "I understand that data collected during the research project may be looked at by individuals from Cardiff University or from regulatory authorities, where it is strictly necessary and/or relevant to my taking part in the research project."
  },
  {
    "id": "c5",
    "text": "I understand that my personal information (demographic data, i.e. income, occupation, age, sex/gender, political leaning and self-reported life satisfaction, and my email address if I am paid by electronic voucher) will be processed for the purposes explained to me, as set out in the information sheet. I understand that such information will be held in accordance with all applicable data protection legislation and in strict confidence, unless disclosure is required by law or professional obligation. I have been informed of my rights under data protection legislation and how I can raise any concerns."
  },
  {
    "id": "c6",
    "text": "I understand who will have access to any personal information provided, how it will be managed, and what will happen to the data at the end of the research project."
  },
  {
    "id": "c7",
    "text": "I understand that after the research project, de-identified data may be made publicly available via a data repository and may be used for purposes not related to this research project. I understand that it will not be possible to identify me from this data."
  },
  {
    "id": "c8",
    "text": "I understand that excerpts and/or verbatim quotes from my questionnaire may be used as part of the research publication but that my data will be anonymised."
  },
  {
    "id": "c9",
    "text": "I understand that I will be randomly assigned to play a game or read a guide, and that I will receive at least £10 for completing the study."
  },
  {
    "id": "c10",
    "text": "I understand how the findings and results of the research project will be written up and published."
  },
  {
    "id": "c11",
    "text": "I agree to take part in this research project."
  }
],
};

const PILOT_CONSENT: ConsentForm = {
  version: 'pilot-1.0 (13 Oct 2026)',
  projectTitle: 'Using Serious Games to Improve Public Comprehension of Utility Frameworks',
  srecReference: '',
  leadResearcher: 'Harry Franklin',
  statements: [
  {
    "id": "c1",
    "text": "I confirm that I have read the information sheet dated 13th October 2026 version 1.0 for the above research project."
  },
  {
    "id": "c2",
    "text": "I confirm that I have understood the information sheet dated 13th October 2026 version 1.0 for the above research project and that I have had the opportunity to ask questions and that these have been answered satisfactorily."
  },
  {
    "id": "c3",
    "text": "I understand that my participation is voluntary and I am free to withdraw at any time during the session without giving a reason. I understand that if I withdraw, any identifiable contact details or notes collected up to that point will be destroyed."
  },
  {
    "id": "c4",
    "text": "I understand that data collected during the research project may be looked at by individuals from Cardiff University or from regulatory authorities, where it is strictly necessary and/or relevant to my taking part in the research project."
  },
  {
    "id": "c5",
    "text": "I understand that my personal information (name and contact details, used only for scheduling this session) will be processed for the purposes explained to me, as set out in the information sheet. I understand that such information will be held in accordance with all applicable data protection legislation and in strict confidence, unless disclosure is required by law or professional obligation. I have been informed of my rights under data protection legislation and how I can raise any concerns."
  },
  {
    "id": "c6",
    "text": "I understand who will have access to any personal information provided, how it will be managed, and what will happen to the data at the end of the research project."
  },
  {
    "id": "c7",
    "text": "I understand that after the research project, anonymised feedback and observational notes may be used in academic publications and conference presentations, and to inform ongoing development of the game. I understand that it will not be possible to identify me from this data."
  },
  {
    "id": "c8",
    "text": "I understand that excerpts and/or verbatim quotes from my interview/questionnaire may be used as part of the research publication but that my data will be anonymised."
  },
  {
    "id": "c9",
    "text": "I understand how the findings and results of the research project will be written up and published."
  },
  {
    "id": "c10",
    "text": "I agree to take part in this research project."
  }
],
};

/** The information sheet for this participant's mode (test uses the live one). */
export function infoSheetFor(mode: StudyMode): InfoSheet {
  return mode === 'pilot' ? PILOT_SHEET : LIVE_SHEET;
}

/** The consent form for this participant's mode (test uses the live one). */
export function consentFormFor(mode: StudyMode): ConsentForm {
  return mode === 'pilot' ? PILOT_CONSENT : LIVE_CONSENT;
}
