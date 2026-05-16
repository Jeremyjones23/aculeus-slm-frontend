window.ACULEUS_DEMO_LIBRARY = {
  "defaultCaseId": "newsom_intermediary_network",
  "cases": [
    {
      "caseId": "newsom_intermediary_network",
      "displayId": "NS-625",
      "caseType": "network_review",
      "caseScope": "statewide_system",
      "title": "California intermediary governance network",
      "headline": "Follow the money. Find the machine.",
      "lead": "Open the California intermediary-governance network: fiscal agents, state programs, sub-grants, political infrastructure, accountability buffers, and the records needed to prove what moved where.",
      "summary": "Aculeus dispatches an investigation across state programs, fiscal intermediaries, funding flows, source gaps, and next records.",
      "jurisdiction": "California",
      "reviewStatus": "dossier_dispatch_ready",
      "publicLabel": "statewide_network_review",
      "legalBoundary": "The source trail supports a network-governance lead and named record requests. It does not establish intent, guilt, or final liability without the missing contracts, monitoring files, and source review.",
      "caseScore": 96,
      "model": {
        "name": "Aculeus SLM",
        "version": "demo-adapter-0.4",
        "mode": "demo_ready",
        "endpoint": "/api/investigate"
      },
      "commandCenter": {
        "break": "State money moves through intermediary networks faster than the public can inspect it.",
        "proof": [
          "Aculeus maps more than $6.2B in committed state and federal funds routed through health, workforce, climate, and immigration program lanes.",
          "The recurring structure is agency appropriation, third-party administrator, sub-granting, capacity building, and delayed public accountability.",
          "The strongest next proof lives in contracts, fee terms, selection criteria, monitoring records, recipient lists, and outcomes."
        ],
        "missing": "Master contracts, administrative-fee schedules, sub-grantee scoring files, monitoring records, outcome reports, board approvals, and conflict disclosures by program lane.",
        "move": "Start with The Center at Sierra Health Foundation and Public Health Institute, then request master contracts, sub-grant lists, fee schedules, scoring files, and monitoring records."
      },
      "entities": [
        {
          "name": "The Center at Sierra Health Foundation",
          "role": "Fiscal intermediary",
          "confidence": 94
        },
        {
          "name": "Public Health Institute",
          "role": "Third-party administrator",
          "confidence": 91
        },
        {
          "name": "California Jobs First / CERF fiscal agents",
          "role": "Regional funding channel",
          "confidence": 87
        },
        {
          "name": "California Volunteers / Bay Area Community Resources",
          "role": "Service and workforce channel",
          "confidence": 84
        }
      ],
      "sourceFamilies": [
        "Master contracts",
        "Administrative fee schedules",
        "Sub-grant recipient lists",
        "RFA/RFP scoring files",
        "Program outcomes",
        "Monitoring reports",
        "Conflict disclosures"
      ],
      "dossier": {
        "title": "The intermediary machine",
        "deck": "Public money moved into a network. Aculeus names the records that can prove how.",
        "posture": "Network lead, not final verdict",
        "centralQuestion": "How much public money moved through intermediary organizations, who selected the recipients, and which records prove whether the work matched the public purpose?",
        "shortFinding": "Aculeus surfaces a statewide governing pattern: state agencies route large programs through nonprofit administrators, those administrators retain fees and distribute sub-grants, and the decisive records sit outside the easy public narrative. The strongest evidence is the repeated program structure across health, workforce, climate, immigration, and service lanes. The next move is not another summary. It is a targeted records run against contracts, fee terms, scoring files, monitoring records, and outcomes.",
        "summary": "Aculeus runs the shadow-network question live: map the funding lanes, identify the intermediaries, classify what the record supports, show what remains missing, and draft the record requests that can move the case.",
        "stats": [
          {
            "label": "Committed funds mapped",
            "value": "$6.2B+",
            "detail": "Mapped across major program lanes"
          },
          {
            "label": "Core lanes",
            "value": "6",
            "detail": "Health, youth, workforce, climate, immigration, service programs"
          },
          {
            "label": "Priority intermediaries",
            "value": "4",
            "detail": "Center, PHI, CERF agents, BACR/volunteer lane"
          },
          {
            "label": "Proof families",
            "value": "7",
            "detail": "Contracts, fees, scoring, monitoring, outcomes, conflicts, recipients"
          }
        ],
        "layers": [
          {
            "label": "Structure",
            "title": "Agency money leaves the obvious channel.",
            "body": "Aculeus surfaces a repeat pattern in the record: agency appropriation, third-party administrator, sub-granting, capacity building, then delayed accountability.",
            "sourceIds": [
              "newsom_dossier",
              "aggregate_program_table"
            ]
          },
          {
            "label": "Money",
            "title": "The scale makes this a system case.",
            "body": "The source trail maps more than $6.2B in committed funds across program lanes. That scale turns the next move into a structured records run.",
            "sourceIds": [
              "aggregate_program_table"
            ]
          },
          {
            "label": "Actors",
            "title": "Intermediaries become the choke point.",
            "body": "The Center at Sierra Health Foundation, Public Health Institute, California Jobs First fiscal agents, and California Volunteers-related lanes become the entities to inspect first.",
            "sourceIds": [
              "sierra_center_profile",
              "phi_profile",
              "cerf_profile",
              "volunteers_profile"
            ]
          },
          {
            "label": "Break",
            "title": "Capacity building blurs the public claim.",
            "body": "When public funds pay for staff, overhead, civic infrastructure, and organizational capacity, the decisive question becomes whether the records show service outcomes or political infrastructure.",
            "sourceIds": [
              "newsom_dossier",
              "sierra_center_profile"
            ]
          }
        ],
        "findings": [
          {
            "findingId": "network-scale",
            "entity": "California intermediary network",
            "signal": "Aggregate funding signal",
            "whatRecordSays": "Aculeus maps more than $6.2B in committed public funds routed through intermediary program lanes from 2020-2025.",
            "whyItMatters": "Scale changes the demo from provider review to system review.",
            "whatItDoesNotProve": "It does not prove misuse by itself.",
            "nextRecord": "Program-by-program master contracts, fee schedules, recipient lists, and monitoring files.",
            "sourceFamily": "Aggregate funding table",
            "sourceIds": [
              "aggregate_program_table"
            ]
          },
          {
            "findingId": "center-gatekeeper",
            "entity": "The Center at Sierra Health Foundation",
            "signal": "Fiscal intermediary profile",
            "whatRecordSays": "Aculeus identifies The Center as a primary intermediary for DHCS, cannabis tax funds, and opioid settlement/program lanes.",
            "whyItMatters": "One entity can become the first audit target because multiple program streams converge there.",
            "whatItDoesNotProve": "A gatekeeper role is not misconduct.",
            "nextRecord": "DHCS contracts, amendments, fee schedules, sub-grantee scoring files, monitoring records, and outcomes.",
            "sourceFamily": "Program profile",
            "sourceIds": [
              "sierra_center_profile"
            ]
          },
          {
            "findingId": "phi-administrator",
            "entity": "Public Health Institute",
            "signal": "Administrator profile",
            "whatRecordSays": "Aculeus identifies PHI as a fiscal manager for CDPH, CYBHI, and State of Equity lanes.",
            "whyItMatters": "The same administrative architecture appears beyond one program.",
            "whatItDoesNotProve": "It does not decide program performance.",
            "nextRecord": "CYBHI contract records, deliverable files, award lists, and monitoring reports.",
            "sourceFamily": "Program profile",
            "sourceIds": [
              "phi_profile"
            ]
          }
        ],
        "claimLedger": [
          {
            "claim": "California uses intermediary administrators as a governing mechanism.",
            "support": "Supported by the source trail",
            "limitation": "Needs contract-by-contract verification.",
            "nextRecord": "Master contracts and fee terms.",
            "sourceIds": [
              "newsom_dossier",
              "aggregate_program_table"
            ]
          },
          {
            "claim": "Capacity-building grants can move public funds into political or organizational infrastructure.",
            "support": "Partially supported",
            "limitation": "Requires recipient-level scope and deliverable records.",
            "nextRecord": "RFA scoring, grant agreements, deliverables, outcomes.",
            "sourceIds": [
              "sierra_center_profile"
            ]
          },
          {
            "claim": "The network buffers accountability.",
            "support": "Partially supported as structural risk",
            "limitation": "Needs monitoring and enforcement records.",
            "nextRecord": "Monitoring files, corrective actions, audit findings.",
            "sourceIds": [
              "newsom_dossier"
            ]
          }
        ],
        "sourceMatrix": [
          {
            "family": "Aggregate funding table",
            "status": "Opened",
            "proves": "Scale and program lanes",
            "missing": "Underlying contract packet per lane"
          },
          {
            "family": "Master contracts",
            "status": "Needed",
            "proves": "Legal authority, fees, deliverables",
            "missing": "Contract text, amendments, exhibits"
          },
          {
            "family": "Sub-grant files",
            "status": "Needed",
            "proves": "Who received funds and why",
            "missing": "Recipient list, scoring, conflict disclosures"
          },
          {
            "family": "Monitoring and outcomes",
            "status": "Needed",
            "proves": "Whether public purpose matched output",
            "missing": "Reports, corrective actions, closeout files"
          }
        ],
        "followUpQuestions": [
          "Which intermediary should we audit first?",
          "What record would falsify the network claim?",
          "Which contracts should a public-record request target first?",
          "Where does the source trail stop short of proof?"
        ],
        "entityFolders": [
          {
            "entity": "The Center at Sierra Health Foundation",
            "receipts": 4,
            "signal": "DHCS, Prop 64, opioid response lanes",
            "gap": "Master contracts, fees, scoring, monitoring",
            "nextMove": "Request DHCS contract and sub-grant packet."
          },
          {
            "entity": "Public Health Institute",
            "receipts": 3,
            "signal": "CDPH/CYBHI administrator profile",
            "gap": "CYBHI deliverables and outcomes",
            "nextMove": "Request PHI contract exhibits and monitoring reports."
          },
          {
            "entity": "California Jobs First fiscal agents",
            "receipts": 2,
            "signal": "Regional fund channel",
            "gap": "Fiscal-agent contracts and award scoring",
            "nextMove": "Request CERF/Catalyst fiscal-agent records."
          }
        ],
        "sourceGroups": [
          {
            "label": "Program architecture",
            "status": "Opened",
            "detail": "Aculeus shows the repeated administrative pattern."
          },
          {
            "label": "Funding scale",
            "status": "Opened",
            "detail": "Aggregate funding table sets review priority."
          },
          {
            "label": "Contract packet",
            "status": "Missing",
            "detail": "Contracts decide fees, deliverables, and authority."
          },
          {
            "label": "Monitoring and outcomes",
            "status": "Missing",
            "detail": "These decide whether the public purpose held."
          }
        ],
        "nextMoves": [
          "Request master contracts, amendments, fee schedules, recipient lists, scoring files, monitoring records, outcomes, and conflict disclosures for the top two intermediaries.",
          "Build a lane-by-lane map that separates public purpose, administrator authority, recipient selection, and measured outcome.",
          "Ask follow-up questions only inside the source trail: what is supported, what is missing, and what record changes the case."
        ]
      },
      "claims": [
        {
          "title": "This is a network case.",
          "body": "The source trail supports a review of intermediary governance architecture across multiple state program lanes.",
          "state": "Supported as scope",
          "sourceIds": [
            "newsom_dossier",
            "aggregate_program_table"
          ],
          "confidence": 88
        }
      ],
      "sources": [
        {
          "sourceId": "newsom_dossier",
          "title": "The Shadow Bureaucracy source run",
          "type": "attached_dossier",
          "publisher": "Aculeus source workspace",
          "role": "Primary source run",
          "retrievedAt": "2026-05-15",
          "confidence": "dossier_source",
          "visibility": "demo_source",
          "url": "local-dossier://newsom_dossier",
          "hash": "newsom_dossier-v1",
          "excerpt": "Forensic source run of California intermediary governance network, 2020-2025.",
          "limitation": "Contract-level records still decide final claims.",
          "publisherType": "aculeus_source_packet",
          "recordDate": "2026-05-15",
          "canonicalUrl": null,
          "localArtifactPath": "data/source-packets/newsom_dossier.md",
          "documentId": "newsom_dossier-v1",
          "pageOrRowLocator": "Network source run, executive synthesis and source index",
          "quotedExcerpt": "Forensic source run of California intermediary governance network, 2020-2025.",
          "excerptLocator": "Network source run, executive synthesis and source index",
          "verificationStatus": "local_source_packet",
          "confidenceTier": "aculeus_synthesis_from_source_packet",
          "retrievalMethod": "Loaded from the Aculeus local source workspace for this demo packet.",
          "chainOfCustodyNote": "Demo packet records the source handle and missing public verification step; final claims stay held until public records are opened."
        },
        {
          "sourceId": "aggregate_program_table",
          "title": "Aggregate program funding table",
          "type": "funding_table",
          "publisher": "Aculeus source workspace",
          "role": "Scale and lane map",
          "retrievedAt": "2026-05-15",
          "confidence": "dossier_source",
          "visibility": "demo_source",
          "url": "local-dossier://aggregate_program_table",
          "hash": "aggregate_program_table-v1",
          "excerpt": "Program table covering CYBHI, Elevate Youth California, SOR, California Jobs First, One California, and volunteer/workforce lanes.",
          "limitation": "Table estimates and snippets require underlying source packets.",
          "publisherType": "aculeus_funding_index",
          "recordDate": "2026-05-15",
          "canonicalUrl": null,
          "localArtifactPath": "data/source-packets/aggregate_program_table.md",
          "documentId": "aggregate_program_table-v1",
          "pageOrRowLocator": "Funding table, program-lane summary rows",
          "quotedExcerpt": "Program table covering CYBHI, Elevate Youth California, SOR, California Jobs First, One California, and volunteer/workforce lanes.",
          "excerptLocator": "Funding table, program-lane summary rows",
          "verificationStatus": "local_source_packet",
          "confidenceTier": "aculeus_synthesis_from_source_packet",
          "retrievalMethod": "Loaded from the Aculeus local source workspace for this demo packet.",
          "chainOfCustodyNote": "Demo packet records the source handle and missing public verification step; final claims stay held until public records are opened."
        },
        {
          "sourceId": "sierra_center_profile",
          "title": "The Center at Sierra Health Foundation profile",
          "type": "intermediary_profile",
          "publisher": "Aculeus source workspace",
          "role": "Priority intermediary",
          "retrievedAt": "2026-05-15",
          "confidence": "dossier_source",
          "visibility": "demo_source",
          "url": "local-dossier://sierra_center_profile",
          "hash": "sierra_center_profile-v1",
          "excerpt": "Profile identifies The Center as intermediary for DHCS, cannabis tax, and opioid response lanes.",
          "limitation": "Profile needs master contracts, scoring files, and monitoring records.",
          "publisherType": "aculeus_intermediary_profile",
          "recordDate": "2026-05-15",
          "canonicalUrl": null,
          "localArtifactPath": "data/source-packets/sierra_center_profile.md",
          "documentId": "sierra_center_profile-v1",
          "pageOrRowLocator": "Intermediary profile, Sierra Center lane notes",
          "quotedExcerpt": "Profile identifies The Center as intermediary for DHCS, cannabis tax, and opioid response lanes.",
          "excerptLocator": "Intermediary profile, Sierra Center lane notes",
          "verificationStatus": "local_source_packet",
          "confidenceTier": "aculeus_synthesis_from_source_packet",
          "retrievalMethod": "Loaded from the Aculeus local source workspace for this demo packet.",
          "chainOfCustodyNote": "Demo packet records the source handle and missing public verification step; final claims stay held until public records are opened."
        },
        {
          "sourceId": "phi_profile",
          "title": "Public Health Institute profile",
          "type": "intermediary_profile",
          "publisher": "Aculeus source workspace",
          "role": "Administrator profile",
          "retrievedAt": "2026-05-15",
          "confidence": "dossier_source",
          "visibility": "demo_source",
          "url": "local-dossier://phi_profile",
          "hash": "phi_profile-v1",
          "excerpt": "Profile identifies PHI as fiscal manager for CDPH, CYBHI, and State of Equity lanes.",
          "limitation": "Profile needs deliverables and outcome support.",
          "publisherType": "aculeus_intermediary_profile",
          "recordDate": "2026-05-15",
          "canonicalUrl": null,
          "localArtifactPath": "data/source-packets/phi_profile.md",
          "documentId": "phi_profile-v1",
          "pageOrRowLocator": "Intermediary profile, PHI lane notes",
          "quotedExcerpt": "Profile identifies PHI as fiscal manager for CDPH, CYBHI, and State of Equity lanes.",
          "excerptLocator": "Intermediary profile, PHI lane notes",
          "verificationStatus": "local_source_packet",
          "confidenceTier": "aculeus_synthesis_from_source_packet",
          "retrievalMethod": "Loaded from the Aculeus local source workspace for this demo packet.",
          "chainOfCustodyNote": "Demo packet records the source handle and missing public verification step; final claims stay held until public records are opened."
        },
        {
          "sourceId": "cerf_profile",
          "title": "California Jobs First / CERF profile",
          "type": "program_profile",
          "publisher": "Aculeus source workspace",
          "role": "Regional fiscal-agent lane",
          "retrievedAt": "2026-05-15",
          "confidence": "dossier_source",
          "visibility": "demo_source",
          "url": "local-dossier://cerf_profile",
          "hash": "cerf_profile-v1",
          "excerpt": "Profile describes fiscal agents and pre-development cash lane.",
          "limitation": "Requires fiscal-agent contracts and award backup.",
          "publisherType": "aculeus_program_profile",
          "recordDate": "2026-05-15",
          "canonicalUrl": null,
          "localArtifactPath": "data/source-packets/cerf_profile.md",
          "documentId": "cerf_profile-v1",
          "pageOrRowLocator": "Program profile, California Jobs First fiscal-agent lane",
          "quotedExcerpt": "Profile describes fiscal agents and pre-development cash lane.",
          "excerptLocator": "Program profile, California Jobs First fiscal-agent lane",
          "verificationStatus": "local_source_packet",
          "confidenceTier": "aculeus_synthesis_from_source_packet",
          "retrievalMethod": "Loaded from the Aculeus local source workspace for this demo packet.",
          "chainOfCustodyNote": "Demo packet records the source handle and missing public verification step; final claims stay held until public records are opened."
        },
        {
          "sourceId": "volunteers_profile",
          "title": "California Volunteers / BACR profile",
          "type": "program_profile",
          "publisher": "Aculeus source workspace",
          "role": "Volunteer/workforce lane",
          "retrievedAt": "2026-05-15",
          "confidence": "dossier_source",
          "visibility": "demo_source",
          "url": "local-dossier://volunteers_profile",
          "hash": "volunteers_profile-v1",
          "excerpt": "Profile connects California Volunteers with Bay Area Community Resources lane.",
          "limitation": "Requires service contracts and outcome records.",
          "publisherType": "aculeus_program_profile",
          "recordDate": "2026-05-15",
          "canonicalUrl": null,
          "localArtifactPath": "data/source-packets/volunteers_profile.md",
          "documentId": "volunteers_profile-v1",
          "pageOrRowLocator": "Program profile, California Volunteers / BACR lane",
          "quotedExcerpt": "Profile connects California Volunteers with Bay Area Community Resources lane.",
          "excerptLocator": "Program profile, California Volunteers / BACR lane",
          "verificationStatus": "local_source_packet",
          "confidenceTier": "aculeus_synthesis_from_source_packet",
          "retrievalMethod": "Loaded from the Aculeus local source workspace for this demo packet.",
          "chainOfCustodyNote": "Demo packet records the source handle and missing public verification step; final claims stay held until public records are opened."
        }
      ],
      "lanes": [
        {
          "laneId": "lead",
          "label": "Question received",
          "headline": "A system question enters.",
          "body": "The user asks how public money moved through intermediary governance.",
          "state": "complete",
          "sourceIds": [
            "newsom_dossier"
          ]
        },
        {
          "laneId": "scope",
          "label": "Scope built",
          "headline": "The agent defines the lanes.",
          "body": "Health, youth, workforce, climate, immigration, and volunteer/service channels become the search map.",
          "state": "complete",
          "sourceIds": [
            "aggregate_program_table"
          ]
        },
        {
          "laneId": "sources",
          "label": "Sources opened",
          "headline": "The record trail opens.",
          "body": "Aculeus opens the source run, aggregate table, intermediary profiles, and program lanes.",
          "state": "complete",
          "sourceIds": [
            "newsom_dossier",
            "aggregate_program_table"
          ]
        },
        {
          "laneId": "money",
          "label": "Money mapped",
          "headline": "Scale drives priority.",
          "body": "The run ranks the top funding and administrator lanes before forming claims.",
          "state": "running",
          "sourceIds": [
            "aggregate_program_table"
          ]
        },
        {
          "laneId": "actors",
          "label": "Actors linked",
          "headline": "Intermediaries surface.",
          "body": "Priority entities become the first audit targets.",
          "state": "running",
          "sourceIds": [
            "sierra_center_profile",
            "phi_profile"
          ]
        },
        {
          "laneId": "gaps",
          "label": "Gaps named",
          "headline": "Proof records are missing.",
          "body": "Contracts, fees, scoring, monitoring, outcomes, and conflicts decide the case.",
          "state": "queued",
          "sourceIds": [
            "newsom_dossier"
          ]
        },
        {
          "laneId": "action",
          "label": "Dispatch ready",
          "headline": "The next move writes itself.",
          "body": "The system drafts a targeted records request and follow-up question path.",
          "state": "queued",
          "sourceIds": [
            "sierra_center_profile",
            "phi_profile"
          ]
        }
      ],
      "nextRecords": [
        {
          "priority": "High",
          "recordId": "center_contract_packet",
          "holder": "DHCS and The Center at Sierra Health Foundation",
          "request": "Please provide master contracts, amendments, fee schedules, sub-grantee lists, scoring files, monitoring records, outcome reports, and conflict disclosures for The Center at Sierra Health Foundation program lanes.",
          "reason": "This packet tests the strongest intermediary lane first."
        },
        {
          "priority": "High",
          "recordId": "phi_contract_packet",
          "holder": "CDPH / CYBHI administrators",
          "request": "Please provide PHI contracts, exhibits, deliverables, payment records, monitoring files, and outcome reports for the relevant program period.",
          "reason": "This tests whether the same structure appears in another major lane."
        }
      ],
      "actions": {
        "directMove": "Request the first two intermediary packets.",
        "recordHolder": "DHCS, CDPH, program administrators, and fiscal agents",
        "requestLanguage": "Please provide master contracts, amendments, administrative-fee schedules, sub-grantee lists, RFA/RFP scoring files, monitoring reports, outcome records, corrective actions, and conflict disclosures for the identified intermediary program lanes from 2020 through 2025.",
        "ifRefused": "Ask for the record index, exemption basis, production schedule, and custodian for each program lane.",
        "briefTargets": [
          "Reviewer",
          "Records counsel",
          "Coalition lead"
        ],
        "coalitionPath": "Brief the coalition by lane: money, administrator, recipient selection, monitoring, outcome, missing records."
      }
    },
    {
      "caseId": "elevate_youth_funding_pipeline",
      "displayId": "EY-370",
      "caseType": "funding_pipeline_review",
      "caseScope": "program_review",
      "title": "Elevate Youth California funding pipeline",
      "headline": "Cannabis tax money entered the youth-prevention machine.",
      "lead": "Investigate Elevate Youth California: cannabis tax funds, DHCS, Sierra Health Foundation, grant recipients, political-organizing signals, participant data, and cost per participant.",
      "summary": "Aculeus opens the program structure, funding pipeline, anomalous recipients, performance math, RFA language, source index, and limitations from the retrieved record trail.",
      "jurisdiction": "California",
      "reviewStatus": "dossier_dispatch_ready",
      "publicLabel": "program_pipeline_review",
      "legalBoundary": "The source trail supports a funding-pipeline review and anomaly questions. It does not prove misuse by any recipient without grant agreements, deliverables, monitoring records, and program outcomes.",
      "caseScore": 93,
      "model": {
        "name": "Aculeus SLM",
        "version": "demo-adapter-0.4",
        "mode": "demo_ready",
        "endpoint": "/api/investigate"
      },
      "commandCenter": {
        "break": "A youth substance-use prevention program funded by cannabis taxes appears to include recipients with political organizing missions.",
        "proof": [
          "Aculeus maps over $370M through 517 grants since launch.",
          "The fiscal intermediary received approximately $71.25M in FY 2024-25 under its DHCS administrative contract.",
          "The RFA language prioritizes policy, systems, environmental change, civic engagement, and social justice youth development."
        ],
        "missing": "Grant agreements, recipient scoring files, deliverables, monitoring records, participant definitions, outcome data, and administrative-fee detail.",
        "move": "Request the recipient packet for high-severity grantees and the DHCS/Sierra Health administrative contract files."
      },
      "entities": [
        {
          "name": "Department of Health Care Services",
          "role": "Program administrator",
          "confidence": 94
        },
        {
          "name": "The Center at Sierra Health Foundation",
          "role": "Fiscal intermediary",
          "confidence": 93
        },
        {
          "name": "Elevate Youth California grantees",
          "role": "Recipient universe",
          "confidence": 89
        }
      ],
      "sourceFamilies": [
        "DHCS legislative reports",
        "Governor press release",
        "Prop 64 Advisory Group minutes",
        "Grant portal RFAs",
        "Partner maps",
        "Recipient mission statements",
        "Participant data"
      ],
      "dossier": {
        "title": "Elevate Youth California",
        "deck": "The pipeline is visible. The outputs need proof.",
        "posture": "Program anomaly lead",
        "centralQuestion": "Did cannabis tax funds designated for youth prevention flow through a program structure that rewarded organizing infrastructure instead of measurable prevention outcomes?",
        "shortFinding": "Aculeus turns the record into a program-pipeline run. It shows funding scale, administrator structure, a fiscal intermediary, recipient mission mismatch, cost-per-participant math, and RFA language that makes civic engagement part of the program design. The record is not done. The next proof is in grant agreements, scoring files, deliverables, monitoring records, and participant outcome definitions.",
        "summary": "Aculeus breaks the case into program authority, funding pipeline, fiscal intermediary, anomalous recipients, performance math, RFA language, source index, and limits.",
        "stats": [
          {
            "label": "Grant funding",
            "value": "$370M+",
            "detail": "Prop 64 cannabis tax program funding mapped"
          },
          {
            "label": "Grants",
            "value": "517",
            "detail": "Community organization awards since launch"
          },
          {
            "label": "FY 24-25 admin contract",
            "value": "$71.25M",
            "detail": "Sierra Health Foundation / The Center contract estimate"
          },
          {
            "label": "Youth participants",
            "value": "89,727",
            "detail": "DHCS participant figure mapped"
          }
        ],
        "layers": [
          {
            "label": "Authority",
            "title": "Prop 64 created the funding channel.",
            "body": "The program draws from cannabis tax funds for youth education, prevention, early intervention, and treatment.",
            "sourceIds": [
              "eyc_legislative_report"
            ]
          },
          {
            "label": "Pipeline",
            "title": "DHCS routes funds through an intermediary.",
            "body": "The funding path runs from cannabis tax revenue to DHCS, then to The Center at Sierra Health Foundation, then to community-based grantees.",
            "sourceIds": [
              "eyc_dossier",
              "prop64_minutes"
            ]
          },
          {
            "label": "Mismatch",
            "title": "Some recipient missions do not read like prevention work.",
            "body": "Aculeus flags organizations whose public missions emphasize voter contact, base building, grassroots power, or organizing-adjacent work.",
            "sourceIds": [
              "eyc_partner_map"
            ]
          },
          {
            "label": "Performance",
            "title": "The cost math demands the next record.",
            "body": "Aculeus compares program funding to DHCS participant data, making participant definitions and outcome files decisive.",
            "sourceIds": [
              "eyc_legislative_report"
            ]
          }
        ],
        "findings": [
          {
            "findingId": "eyc-scale",
            "entity": "Elevate Youth California",
            "signal": "Funding scale",
            "whatRecordSays": "Aculeus maps DHCS awards above $370M through 517 grants since launch.",
            "whyItMatters": "Scale turns the question into an audit-worthy program review.",
            "whatItDoesNotProve": "Scale does not prove misuse.",
            "nextRecord": "Cohort-level award data, grant agreements, deliverables, monitoring records, and outcomes.",
            "sourceFamily": "DHCS/Governor source trail",
            "sourceIds": [
              "governor_press_release",
              "eyc_legislative_report"
            ]
          },
          {
            "findingId": "eyc-intermediary",
            "entity": "The Center at Sierra Health Foundation",
            "signal": "Administrative contract",
            "whatRecordSays": "Aculeus maps approximately $71.25M in FY 2024-25 under the administrative contract with DHCS.",
            "whyItMatters": "The intermediary contract is a direct records target.",
            "whatItDoesNotProve": "Administrative scale does not prove improper work.",
            "nextRecord": "Administrative contract, fee schedule, scope, deliverables, monitoring files, and amendments.",
            "sourceFamily": "Prop 64 Advisory Group minutes",
            "sourceIds": [
              "prop64_minutes"
            ]
          },
          {
            "findingId": "eyc-mission-mismatch",
            "entity": "High-severity recipients",
            "signal": "Mission mismatch",
            "whatRecordSays": "Aculeus identifies recipients with stated missions centered on political organizing, voter contact, base building, or grassroots mobilization.",
            "whyItMatters": "Mission mismatch is the strongest user-visible anomaly.",
            "whatItDoesNotProve": "Mission language does not decide grant performance.",
            "nextRecord": "Recipient grant agreements, scored applications, deliverables, monitoring reviews, and outcome records.",
            "sourceFamily": "Partner map and recipient records",
            "sourceIds": [
              "eyc_partner_map",
              "grants_portal_rfa"
            ]
          }
        ],
        "claimLedger": [
          {
            "claim": "The program pipeline is DHCS to Sierra Health to grantees.",
            "support": "Supported by dossier structure",
            "limitation": "Contract records still needed.",
            "nextRecord": "DHCS administrative contract and amendments.",
            "sourceIds": [
              "eyc_dossier",
              "prop64_minutes"
            ]
          },
          {
            "claim": "Some recipients look politically oriented.",
            "support": "Partially supported by mission-language review",
            "limitation": "Needs grant deliverables and monitoring files.",
            "nextRecord": "Recipient application, grant agreement, deliverables.",
            "sourceIds": [
              "eyc_partner_map"
            ]
          },
          {
            "claim": "Cost per participant raises audit questions.",
            "support": "Supported as calculation lead",
            "limitation": "Depends on participant definitions and outcome records.",
            "nextRecord": "Participant methodology and outcome reports.",
            "sourceIds": [
              "eyc_legislative_report"
            ]
          }
        ],
        "sourceMatrix": [
          {
            "family": "DHCS legislative report",
            "status": "Opened",
            "proves": "Program authority and participant figures",
            "missing": "Definitions, raw participant records, outcomes"
          },
          {
            "family": "Prop 64 minutes",
            "status": "Opened",
            "proves": "Administrative contract signal",
            "missing": "Contract text and fee schedule"
          },
          {
            "family": "Grant portal RFA",
            "status": "Opened",
            "proves": "Selection language and program priorities",
            "missing": "Application scoring files"
          },
          {
            "family": "Recipient packets",
            "status": "Needed",
            "proves": "What each grantee promised and delivered",
            "missing": "Agreements, deliverables, monitoring"
          }
        ],
        "followUpQuestions": [
          "Which recipients are high severity?",
          "What records prove mission mismatch?",
          "What is the cost per participant?",
          "Which request should go first?"
        ],
        "entityFolders": [
          {
            "entity": "DHCS",
            "receipts": 3,
            "signal": "Program authority and participant reporting",
            "gap": "Raw participant methodology and outcomes",
            "nextMove": "Request participant definitions and outcome files."
          },
          {
            "entity": "The Center at Sierra Health Foundation",
            "receipts": 3,
            "signal": "Administrative contract and intermediary role",
            "gap": "Fee schedule and deliverables",
            "nextMove": "Request administrative contract packet."
          },
          {
            "entity": "High-severity recipients",
            "receipts": 4,
            "signal": "Organizing or voter-contact mission language",
            "gap": "Grant agreement and monitoring file",
            "nextMove": "Request recipient-level grant packet."
          }
        ],
        "sourceGroups": [
          {
            "label": "Funding authority",
            "status": "Opened",
            "detail": "Prop 64 and DHCS materials define the funding lane."
          },
          {
            "label": "Intermediary contract",
            "status": "Partial",
            "detail": "Minutes show signal; contract packet decides."
          },
          {
            "label": "Recipient mission review",
            "status": "Opened",
            "detail": "Mission mismatch creates anomaly leads."
          },
          {
            "label": "Outcomes",
            "status": "Missing",
            "detail": "Participant definitions and outcomes decide strength."
          }
        ],
        "nextMoves": [
          "Request DHCS/Sierra Health contract packet, fee schedules, amendments, deliverables, and monitoring records.",
          "Rank high-severity recipients by mission mismatch, dollars, and source coverage.",
          "Request recipient-level grant agreements, scored applications, deliverables, monitoring records, and outcome support."
        ]
      },
      "claims": [
        {
          "title": "This is a pipeline case.",
          "body": "The source trail supports a funding path from cannabis tax revenue to DHCS, an intermediary, and grantee recipients.",
          "state": "Supported as structure",
          "sourceIds": [
            "eyc_dossier",
            "prop64_minutes"
          ],
          "confidence": 88
        }
      ],
      "sources": [
        {
          "sourceId": "eyc_dossier",
          "title": "Elevate Youth California source run",
          "type": "attached_dossier",
          "publisher": "Aculeus source workspace",
          "role": "Primary source run",
          "retrievedAt": "2026-05-15",
          "confidence": "dossier_source",
          "visibility": "demo_source",
          "url": "local-dossier://eyc_dossier",
          "hash": "eyc_dossier-v1",
          "excerpt": "Source run covering $370M+ in Proposition 64 cannabis tax funds administered by DHCS through Sierra Health Foundation: The Center.",
          "limitation": "The source trail creates leads; contract and monitoring records decide final claims.",
          "publisherType": "aculeus_source_packet",
          "recordDate": "2026-05-15",
          "canonicalUrl": null,
          "localArtifactPath": "data/source-packets/eyc_dossier.md",
          "documentId": "eyc_dossier-v1",
          "pageOrRowLocator": "Elevate Youth source run, findings and source index",
          "quotedExcerpt": "Source run covering $370M+ in Proposition 64 cannabis tax funds administered by DHCS through Sierra Health Foundation: The Center.",
          "excerptLocator": "Elevate Youth source run, findings and source index",
          "verificationStatus": "local_source_packet",
          "confidenceTier": "aculeus_synthesis_from_source_packet",
          "retrievalMethod": "Loaded from the Aculeus local source workspace for this demo packet.",
          "chainOfCustodyNote": "Demo packet records the source handle and missing public verification step; final claims stay held until public records are opened."
        },
        {
          "sourceId": "eyc_legislative_report",
          "title": "DHCS YEPEITA legislative report",
          "type": "government_report",
          "publisher": "Aculeus source workspace",
          "role": "Program authority and participant data",
          "retrievedAt": "2026-05-15",
          "confidence": "dossier_source",
          "visibility": "demo_source",
          "url": "local-dossier://eyc_legislative_report",
          "hash": "eyc_legislative_report-v1",
          "excerpt": "Official legislative reporting for Youth Education, Prevention, Early Intervention, and Treatment Account activity.",
          "limitation": "Participant figures require definitions and raw outcome records.",
          "publisherType": "official_government_report",
          "recordDate": "2026-05-15",
          "canonicalUrl": null,
          "localArtifactPath": "data/source-packets/eyc_legislative_report.md",
          "documentId": "eyc_legislative_report-v1",
          "pageOrRowLocator": "Legislative report support section",
          "quotedExcerpt": "Official legislative reporting for Youth Education, Prevention, Early Intervention, and Treatment Account activity.",
          "excerptLocator": "Legislative report support section",
          "verificationStatus": "local_source_packet",
          "confidenceTier": "primary_or_official_record",
          "retrievalMethod": "Loaded from the Aculeus local source workspace for this demo packet.",
          "chainOfCustodyNote": "Demo packet records the source handle and missing public verification step; final claims stay held until public records are opened."
        },
        {
          "sourceId": "governor_press_release",
          "title": "Governor press release, Dec. 19, 2025",
          "type": "press_release",
          "publisher": "Aculeus source workspace",
          "role": "Funding total signal",
          "retrievedAt": "2026-05-15",
          "confidence": "dossier_source",
          "visibility": "demo_source",
          "url": "local-dossier://governor_press_release",
          "hash": "governor_press_release-v1",
          "excerpt": "Press release cited by the dossier for grant funding scale.",
          "limitation": "A press release is a public signal, not the underlying grant packet.",
          "publisherType": "official_public_statement",
          "recordDate": "2026-05-15",
          "canonicalUrl": null,
          "localArtifactPath": "data/source-packets/governor_press_release.md",
          "documentId": "governor_press_release-v1",
          "pageOrRowLocator": "Public announcement support section",
          "quotedExcerpt": "Press release cited by the dossier for grant funding scale.",
          "excerptLocator": "Public announcement support section",
          "verificationStatus": "local_source_packet",
          "confidenceTier": "official_public_statement",
          "retrievalMethod": "Loaded from the Aculeus local source workspace for this demo packet.",
          "chainOfCustodyNote": "Demo packet records the source handle and missing public verification step; final claims stay held until public records are opened."
        },
        {
          "sourceId": "prop64_minutes",
          "title": "Prop 64 Advisory Group minutes, Mar. 20, 2025",
          "type": "meeting_minutes",
          "publisher": "Aculeus source workspace",
          "role": "Administrative contract signal",
          "retrievedAt": "2026-05-15",
          "confidence": "dossier_source",
          "visibility": "demo_source",
          "url": "local-dossier://prop64_minutes",
          "hash": "prop64_minutes-v1",
          "excerpt": "Minutes cited for approximately $71.25M in FY 2024-25 administrative contract value.",
          "limitation": "Minutes need the actual contract, amendments, and deliverables.",
          "publisherType": "official_meeting_record",
          "recordDate": "2026-05-15",
          "canonicalUrl": null,
          "localArtifactPath": "data/source-packets/prop64_minutes.md",
          "documentId": "prop64_minutes-v1",
          "pageOrRowLocator": "Meeting minutes, funding and advisory discussion",
          "quotedExcerpt": "Minutes cited for approximately $71.25M in FY 2024-25 administrative contract value.",
          "excerptLocator": "Meeting minutes, funding and advisory discussion",
          "verificationStatus": "local_source_packet",
          "confidenceTier": "primary_or_official_record",
          "retrievalMethod": "Loaded from the Aculeus local source workspace for this demo packet.",
          "chainOfCustodyNote": "Demo packet records the source handle and missing public verification step; final claims stay held until public records are opened."
        },
        {
          "sourceId": "grants_portal_rfa",
          "title": "California Grants Portal Cohort 7 RFA",
          "type": "rfa",
          "publisher": "Aculeus source workspace",
          "role": "Program language",
          "retrievedAt": "2026-05-15",
          "confidence": "dossier_source",
          "visibility": "demo_source",
          "url": "local-dossier://grants_portal_rfa",
          "hash": "grants_portal_rfa-v1",
          "excerpt": "RFA language cited for policy, systems, environmental change, civic engagement, and social justice youth development priorities.",
          "limitation": "RFA language must be matched to recipient scoring and deliverables.",
          "publisherType": "official_grant_document",
          "recordDate": "2026-05-15",
          "canonicalUrl": null,
          "localArtifactPath": "data/source-packets/grants_portal_rfa.md",
          "documentId": "grants_portal_rfa-v1",
          "pageOrRowLocator": "RFA packet, eligibility and deliverable language",
          "quotedExcerpt": "RFA language cited for policy, systems, environmental change, civic engagement, and social justice youth development priorities.",
          "excerptLocator": "RFA packet, eligibility and deliverable language",
          "verificationStatus": "local_source_packet",
          "confidenceTier": "primary_or_official_record",
          "retrievalMethod": "Loaded from the Aculeus local source workspace for this demo packet.",
          "chainOfCustodyNote": "Demo packet records the source handle and missing public verification step; final claims stay held until public records are opened."
        },
        {
          "sourceId": "eyc_partner_map",
          "title": "Elevate Youth California partners map",
          "type": "recipient_map",
          "publisher": "Aculeus source workspace",
          "role": "Recipient universe",
          "retrievedAt": "2026-05-15",
          "confidence": "dossier_source",
          "visibility": "demo_source",
          "url": "local-dossier://eyc_partner_map",
          "hash": "eyc_partner_map-v1",
          "excerpt": "Partner map and recipient records seed the anomalous-recipient review.",
          "limitation": "Recipient mission review does not decide performance without grant files.",
          "publisherType": "aculeus_recipient_map",
          "recordDate": "2026-05-15",
          "canonicalUrl": null,
          "localArtifactPath": "data/source-packets/eyc_partner_map.md",
          "documentId": "eyc_partner_map-v1",
          "pageOrRowLocator": "Recipient map, partner and award rows",
          "quotedExcerpt": "Partner map and recipient records seed the anomalous-recipient review.",
          "excerptLocator": "Recipient map, partner and award rows",
          "verificationStatus": "local_source_packet",
          "confidenceTier": "aculeus_synthesis_from_source_packet",
          "retrievalMethod": "Loaded from the Aculeus local source workspace for this demo packet.",
          "chainOfCustodyNote": "Demo packet records the source handle and missing public verification step; final claims stay held until public records are opened."
        }
      ],
      "lanes": [
        {
          "laneId": "lead",
          "label": "Question received",
          "headline": "The funding question enters.",
          "body": "Cannabis tax funds, youth-prevention purpose, and recipient missions become the investigation target.",
          "state": "complete",
          "sourceIds": [
            "eyc_dossier"
          ]
        },
        {
          "laneId": "authority",
          "label": "Authority opened",
          "headline": "The statute sets the lane.",
          "body": "Prop 64 and DHCS reports define the public purpose.",
          "state": "complete",
          "sourceIds": [
            "eyc_legislative_report"
          ]
        },
        {
          "laneId": "pipeline",
          "label": "Pipeline mapped",
          "headline": "Money moves through the intermediary.",
          "body": "DHCS and Sierra Health become the central record holders.",
          "state": "complete",
          "sourceIds": [
            "prop64_minutes"
          ]
        },
        {
          "laneId": "recipients",
          "label": "Recipients scanned",
          "headline": "Mission mismatch appears.",
          "body": "The agent flags grantees whose public mission may not match prevention work.",
          "state": "running",
          "sourceIds": [
            "eyc_partner_map"
          ]
        },
        {
          "laneId": "math",
          "label": "Cost checked",
          "headline": "Participant math raises questions.",
          "body": "The cost-per-participant signal demands outcome definitions.",
          "state": "running",
          "sourceIds": [
            "eyc_legislative_report"
          ]
        },
        {
          "laneId": "gaps",
          "label": "Gaps named",
          "headline": "Grant packets decide.",
          "body": "Applications, agreements, deliverables, monitoring, and outcomes are missing.",
          "state": "queued",
          "sourceIds": [
            "grants_portal_rfa"
          ]
        },
        {
          "laneId": "action",
          "label": "Dispatch ready",
          "headline": "The requests are clear.",
          "body": "The system drafts the administrative and recipient records request.",
          "state": "queued",
          "sourceIds": [
            "prop64_minutes",
            "eyc_partner_map"
          ]
        }
      ],
      "nextRecords": [
        {
          "priority": "High",
          "recordId": "eyc_admin_packet",
          "holder": "DHCS and The Center at Sierra Health Foundation",
          "request": "Please provide the EYC administrative contract, amendments, fee schedule, deliverables, monitoring records, recipient list, RFA scoring files, and outcome reports.",
          "reason": "This packet tests program control and intermediary authority."
        },
        {
          "priority": "High",
          "recordId": "eyc_recipient_packets",
          "holder": "DHCS / Sierra Health / grantee record custodians",
          "request": "Please provide grant agreements, applications, scoring sheets, deliverables, monitoring reviews, payment records, and outcome support for high-severity recipients.",
          "reason": "This tests whether mission mismatch is real in the grant files."
        }
      ],
      "actions": {
        "directMove": "Request the administrative contract packet and high-severity recipient packets.",
        "recordHolder": "DHCS and The Center at Sierra Health Foundation",
        "requestLanguage": "Please provide the Elevate Youth California administrative contract, amendments, fee schedules, recipient lists, RFA/RFP scoring files, applications, grant agreements, deliverables, monitoring reports, participant definitions, outcome records, and conflict disclosures for the identified cohorts and recipients.",
        "ifRefused": "Ask for the record index, exemption basis, and custodian by cohort and recipient.",
        "briefTargets": [
          "Reviewer",
          "Records counsel",
          "Coalition lead"
        ],
        "coalitionPath": "Brief the case as a funding-pipeline anomaly: purpose, intermediary, recipient selection, outcomes, missing records."
      }
    },
    {
      "caseId": "grid_political_infrastructure",
      "displayId": "GR-312",
      "caseType": "forensic_audit",
      "caseScope": "organization_network",
      "title": "GRID Alternatives political infrastructure audit",
      "headline": "A solar installer became a funding machine.",
      "lead": "Audit GRID Alternatives as political infrastructure: federal climate funding, prime awardee status, partner ecosystem, workforce field operations, and electoral/civic engagement correlation.",
      "summary": "Aculeus opens the GRID dossier as a layered forensic audit: financial catalyst, strategic architect, field operations, partnership network, electoral correlation, and missing proof.",
      "jurisdiction": "United States / California",
      "reviewStatus": "dossier_dispatch_ready",
      "publicLabel": "organization_network_review",
      "legalBoundary": "The source trail supports a political-infrastructure review lead. It does not prove unlawful conduct or intent without contracts, sub-recipient records, activity logs, and outcome files.",
      "caseScore": 90,
      "model": {
        "name": "Aculeus SLM",
        "version": "demo-adapter-0.4",
        "mode": "demo_ready",
        "endpoint": "/api/investigate"
      },
      "commandCenter": {
        "break": "A technical service nonprofit appears to have become a national funding and field-infrastructure hub.",
        "proof": [
          "Aculeus identifies a major 2024 federal funding catalyst.",
          "Audited financials and Form 990 data show revenue and asset growth signals.",
          "The partnership ecosystem connects technical solar deployment, housing networks, workforce programs, and civic engagement organizations."
        ],
        "missing": "Federal award agreements, sub-recipient contracts, administrative fees, field-operation logs, partner MOUs, outreach scripts, voter-contact boundaries, and performance outcomes.",
        "move": "Request award contracts, sub-recipient lists, fee schedules, partner MOUs, and field-operation records before any public claim moves."
      },
      "entities": [
        {
          "name": "GRID Alternatives",
          "role": "Prime awardee / network hub",
          "confidence": 92
        },
        {
          "name": "EPA / DOE program lanes",
          "role": "Federal funding source",
          "confidence": 89
        },
        {
          "name": "ACCE / GreenLatinos / CIPC and partners",
          "role": "Advocacy ecosystem",
          "confidence": 82
        },
        {
          "name": "SolarCorps / workforce infrastructure",
          "role": "Field operation",
          "confidence": 84
        }
      ],
      "sourceFamilies": [
        "Federal award announcements",
        "Audited financials",
        "IRS Form 990",
        "Impact reports",
        "Partner ecosystem records",
        "Field-operation records",
        "Legislative/regulatory materials"
      ],
      "dossier": {
        "title": "GRID Alternatives political infrastructure",
        "deck": "The funding catalyst is visible. The field record decides the claim.",
        "posture": "Forensic audit lead",
        "centralQuestion": "Did federal climate funding and prime-awardee status turn a technical solar nonprofit into civic and political infrastructure?",
        "shortFinding": "The GRID dossier is a strong demo for layered institutional analysis. It starts with a financial catalyst, then opens leadership, partnerships, field operations, and electoral/civic correlation. The record supports a serious infrastructure question. The next proof is not rhetoric. It is contracts, sub-recipient agreements, administrative fees, partner MOUs, field-operation records, and outcome data.",
        "summary": "Aculeus converts the GRID audit into layers: financial catalyst, strategic architect, partnership ecosystem, field operations, and political correlation.",
        "stats": [
          {
            "label": "Federal award signal",
            "value": "$312M",
            "detail": "2024 award exposure mapped"
          },
          {
            "label": "SANAH program",
            "value": "$249.8M",
            "detail": "Solar Access for Nationwide Affordable Housing pillar"
          },
          {
            "label": "Program states",
            "value": "30+",
            "detail": "Deployment footprint mapped"
          },
          {
            "label": "Audit sections",
            "value": "4",
            "detail": "Finance, strategy, field operations, electoral correlation"
          }
        ],
        "layers": [
          {
            "label": "Financial catalyst",
            "title": "Federal money changed the scale.",
            "body": "Aculeus maps GRID moving from California nonprofit installer to national administrative hub for federal climate funding.",
            "sourceIds": [
              "grid_dossier",
              "grid_federal_awards"
            ]
          },
          {
            "label": "Strategic architect",
            "title": "The organization moved into policy infrastructure.",
            "body": "Leadership, DC presence, and partnership structure made GRID more than a technical service provider.",
            "sourceIds": [
              "grid_dossier",
              "grid_partnerships"
            ]
          },
          {
            "label": "Field operations",
            "title": "Deployment creates trust and contact.",
            "body": "Solar installation, utility assistance, door-to-door outreach, workforce programs, and contractor networks become the operational layer to inspect.",
            "sourceIds": [
              "grid_field_operations"
            ]
          },
          {
            "label": "Correlation",
            "title": "The electoral question needs hard records.",
            "body": "Aculeus raises civic-engagement and voter-bloc questions only as an investigative lead. The proof requires boundaries, scripts, activity logs, and partner MOUs.",
            "sourceIds": [
              "grid_partnerships",
              "grid_field_operations"
            ]
          }
        ],
        "findings": [
          {
            "findingId": "grid-federal-catalyst",
            "entity": "GRID Alternatives",
            "signal": "Federal funding catalyst",
            "whatRecordSays": "Aculeus identifies a 2024 federal grant-award signal of approximately $312.25M and a SANAH pillar provisionally awarded $249.8M.",
            "whyItMatters": "Scale makes GRID a national infrastructure review target.",
            "whatItDoesNotProve": "A federal award does not prove political misuse.",
            "nextRecord": "Award agreements, scopes, administrative fees, sub-recipient contracts, and deliverables.",
            "sourceFamily": "Federal award and audited financial records",
            "sourceIds": [
              "grid_federal_awards",
              "grid_financials"
            ]
          },
          {
            "findingId": "grid-prime-awardee",
            "entity": "GRID Alternatives",
            "signal": "Prime awardee model",
            "whatRecordSays": "Aculeus maps GRID as a lead coalition manager that can capture administrative and technical assistance fees while managing sub-recipients.",
            "whyItMatters": "The prime-awardee role is where money, control, and partner selection meet.",
            "whatItDoesNotProve": "Administrative control is not misconduct.",
            "nextRecord": "Sub-recipient lists, fee schedules, selection criteria, monitoring files.",
            "sourceFamily": "Program administration records",
            "sourceIds": [
              "grid_financials",
              "grid_federal_awards"
            ]
          },
          {
            "findingId": "grid-field-network",
            "entity": "SolarCorps and partner ecosystem",
            "signal": "Field operation and partnership map",
            "whatRecordSays": "Aculeus maps solar installation, workforce infrastructure, direct outreach, and advocacy/housing partners as the field layer.",
            "whyItMatters": "Field infrastructure is the bridge between technical service and civic influence.",
            "whatItDoesNotProve": "The map does not prove electoral activity.",
            "nextRecord": "Partner MOUs, outreach scripts, field logs, AmeriCorps/SolarCorps work plans, and voter-contact boundaries.",
            "sourceFamily": "Field-operation records",
            "sourceIds": [
              "grid_partnerships",
              "grid_field_operations"
            ]
          }
        ],
        "claimLedger": [
          {
            "claim": "GRID became a national administrative hub.",
            "support": "Supported as dossier lead",
            "limitation": "Needs federal award and sub-recipient files.",
            "nextRecord": "Award agreements and sub-recipient contracts.",
            "sourceIds": [
              "grid_dossier",
              "grid_federal_awards"
            ]
          },
          {
            "claim": "The partnership ecosystem connects services to political organizing capacity.",
            "support": "Partially supported",
            "limitation": "Needs partner MOUs and activity records.",
            "nextRecord": "Partner MOUs and field logs.",
            "sourceIds": [
              "grid_partnerships"
            ]
          },
          {
            "claim": "Field operations may convert service delivery into civic power.",
            "support": "Investigative hypothesis",
            "limitation": "Needs outreach boundaries and activity logs.",
            "nextRecord": "Scripts, logs, training materials, voter-contact guardrails.",
            "sourceIds": [
              "grid_field_operations"
            ]
          }
        ],
        "sourceMatrix": [
          {
            "family": "Federal awards",
            "status": "Opened",
            "proves": "Scale and program authority",
            "missing": "Full award agreements and amendments"
          },
          {
            "family": "Financial filings",
            "status": "Opened",
            "proves": "Revenue and asset movement",
            "missing": "Program-level fee allocation"
          },
          {
            "family": "Partner ecosystem",
            "status": "Partial",
            "proves": "Network map",
            "missing": "MOUs and activity boundaries"
          },
          {
            "family": "Field operations",
            "status": "Needed",
            "proves": "What happened on the ground",
            "missing": "Logs, scripts, work plans, outcomes"
          }
        ],
        "followUpQuestions": [
          "What records prove the prime-awardee model?",
          "Which partners matter most?",
          "What would falsify the political-infrastructure claim?",
          "What request should go to GRID or EPA first?"
        ],
        "entityFolders": [
          {
            "entity": "GRID Alternatives",
            "receipts": 5,
            "signal": "Federal award and audited financial growth signals",
            "gap": "Award contracts, sub-recipient files, fee schedules",
            "nextMove": "Request award and sub-recipient packet."
          },
          {
            "entity": "Partner ecosystem",
            "receipts": 4,
            "signal": "Advocacy, housing, workforce, and civic partners mapped",
            "gap": "MOUs and activity records",
            "nextMove": "Request partner agreements and field boundaries."
          },
          {
            "entity": "SolarCorps / workforce programs",
            "receipts": 3,
            "signal": "Field infrastructure and trusted-messenger posture",
            "gap": "Work plans, outreach scripts, logs",
            "nextMove": "Request field-operation packet."
          }
        ],
        "sourceGroups": [
          {
            "label": "Federal funding",
            "status": "Opened",
            "detail": "Award signals create scale and priority."
          },
          {
            "label": "Financial filings",
            "status": "Opened",
            "detail": "Audits and 990s anchor growth."
          },
          {
            "label": "Partnership ecosystem",
            "status": "Partial",
            "detail": "Network map exists; activity records needed."
          },
          {
            "label": "Field operations",
            "status": "Missing",
            "detail": "This decides whether infrastructure claims hold."
          }
        ],
        "nextMoves": [
          "Request federal award agreements, amendments, administrative fee schedules, sub-recipient lists, deliverables, and monitoring files.",
          "Request partner MOUs, outreach plans, scripts, field logs, and civic-engagement boundaries.",
          "Separate technical service delivery from political infrastructure before any public claim moves."
        ]
      },
      "claims": [
        {
          "title": "This is an infrastructure audit.",
          "body": "The source trail supports review of how climate funding, program administration, partners, and field operations connect.",
          "state": "Supported as scope",
          "sourceIds": [
            "grid_dossier",
            "grid_federal_awards"
          ],
          "confidence": 85
        }
      ],
      "sources": [
        {
          "sourceId": "grid_dossier",
          "title": "GRID Alternatives source run",
          "type": "attached_dossier",
          "publisher": "Aculeus source workspace",
          "role": "Primary source run",
          "retrievedAt": "2026-05-15",
          "confidence": "dossier_source",
          "visibility": "demo_source",
          "url": "local-dossier://grid_dossier",
          "hash": "grid_dossier-v1",
          "excerpt": "Forensic source run on GRID Alternatives political infrastructure.",
          "limitation": "Source records decide final claims.",
          "publisherType": "aculeus_source_packet",
          "recordDate": "2026-05-15",
          "canonicalUrl": null,
          "localArtifactPath": "data/source-packets/grid_dossier.md",
          "documentId": "grid_dossier-v1",
          "pageOrRowLocator": "GRID source run, infrastructure findings and source index",
          "quotedExcerpt": "Forensic source run on GRID Alternatives political infrastructure.",
          "excerptLocator": "GRID source run, infrastructure findings and source index",
          "verificationStatus": "local_source_packet",
          "confidenceTier": "aculeus_synthesis_from_source_packet",
          "retrievalMethod": "Loaded from the Aculeus local source workspace for this demo packet.",
          "chainOfCustodyNote": "Demo packet records the source handle and missing public verification step; final claims stay held until public records are opened."
        },
        {
          "sourceId": "grid_federal_awards",
          "title": "Federal climate funding award trail",
          "type": "federal_award",
          "publisher": "Aculeus source workspace",
          "role": "Award scale and authority",
          "retrievedAt": "2026-05-15",
          "confidence": "dossier_source",
          "visibility": "demo_source",
          "url": "local-dossier://grid_federal_awards",
          "hash": "grid_federal_awards-v1",
          "excerpt": "Award signal includes approximately $312.25M total and a $249.8M SANAH pillar cited in the dossier.",
          "limitation": "Award announcements require full agreements and deliverables.",
          "publisherType": "public_award_database",
          "recordDate": "2026-05-15",
          "canonicalUrl": null,
          "localArtifactPath": "data/source-packets/grid_federal_awards.md",
          "documentId": "grid_federal_awards-v1",
          "pageOrRowLocator": "Federal award trail, award and obligation rows",
          "quotedExcerpt": "Award signal includes approximately $312.25M total and a $249.8M SANAH pillar cited in the dossier.",
          "excerptLocator": "Federal award trail, award and obligation rows",
          "verificationStatus": "local_source_packet",
          "confidenceTier": "primary_or_official_record",
          "retrievalMethod": "Loaded from the Aculeus local source workspace for this demo packet.",
          "chainOfCustodyNote": "Demo packet records the source handle and missing public verification step; final claims stay held until public records are opened."
        },
        {
          "sourceId": "grid_financials",
          "title": "GRID audited financials and Form 990 trail",
          "type": "financial_filings",
          "publisher": "Aculeus source workspace",
          "role": "Revenue and asset analysis",
          "retrievedAt": "2026-05-15",
          "confidence": "dossier_source",
          "visibility": "demo_source",
          "url": "local-dossier://grid_financials",
          "hash": "grid_financials-v1",
          "excerpt": "Aculeus tracks revenue, government grants, assets, and net assets across 2021-2024.",
          "limitation": "Financial totals need program-level allocation records.",
          "publisherType": "public_financial_records",
          "recordDate": "2026-05-15",
          "canonicalUrl": null,
          "localArtifactPath": "data/source-packets/grid_financials.md",
          "documentId": "grid_financials-v1",
          "pageOrRowLocator": "Financial records, audited financials and Form 990 trail",
          "quotedExcerpt": "Aculeus tracks revenue, government grants, assets, and net assets across 2021-2024.",
          "excerptLocator": "Financial records, audited financials and Form 990 trail",
          "verificationStatus": "local_source_packet",
          "confidenceTier": "primary_or_official_record",
          "retrievalMethod": "Loaded from the Aculeus local source workspace for this demo packet.",
          "chainOfCustodyNote": "Demo packet records the source handle and missing public verification step; final claims stay held until public records are opened."
        },
        {
          "sourceId": "grid_partnerships",
          "title": "GRID partnership ecosystem map",
          "type": "partner_map",
          "publisher": "Aculeus source workspace",
          "role": "Network map",
          "retrievedAt": "2026-05-15",
          "confidence": "dossier_source",
          "visibility": "demo_source",
          "url": "local-dossier://grid_partnerships",
          "hash": "grid_partnerships-v1",
          "excerpt": "Aculeus maps housing, advocacy, workforce, and political-organizing adjacent partners.",
          "limitation": "Partner map needs MOUs and activity records.",
          "publisherType": "aculeus_partner_map",
          "recordDate": "2026-05-15",
          "canonicalUrl": null,
          "localArtifactPath": "data/source-packets/grid_partnerships.md",
          "documentId": "grid_partnerships-v1",
          "pageOrRowLocator": "Partnership map, named coalition and partner entries",
          "quotedExcerpt": "Aculeus maps housing, advocacy, workforce, and political-organizing adjacent partners.",
          "excerptLocator": "Partnership map, named coalition and partner entries",
          "verificationStatus": "local_source_packet",
          "confidenceTier": "aculeus_synthesis_from_source_packet",
          "retrievalMethod": "Loaded from the Aculeus local source workspace for this demo packet.",
          "chainOfCustodyNote": "Demo packet records the source handle and missing public verification step; final claims stay held until public records are opened."
        },
        {
          "sourceId": "grid_field_operations",
          "title": "SolarCorps and field operations profile",
          "type": "field_operations",
          "publisher": "Aculeus source workspace",
          "role": "Field infrastructure",
          "retrievedAt": "2026-05-15",
          "confidence": "dossier_source",
          "visibility": "demo_source",
          "url": "local-dossier://grid_field_operations",
          "hash": "grid_field_operations-v1",
          "excerpt": "Aculeus identifies solar installation, utility assistance, door-to-door outreach, contractor networking, and workforce operations.",
          "limitation": "Field operations need logs, scripts, training, and outcome records.",
          "publisherType": "aculeus_field_profile",
          "recordDate": "2026-05-15",
          "canonicalUrl": null,
          "localArtifactPath": "data/source-packets/grid_field_operations.md",
          "documentId": "grid_field_operations-v1",
          "pageOrRowLocator": "Field operations profile, SolarCorps and field-program notes",
          "quotedExcerpt": "Aculeus identifies solar installation, utility assistance, door-to-door outreach, contractor networking, and workforce operations.",
          "excerptLocator": "Field operations profile, SolarCorps and field-program notes",
          "verificationStatus": "local_source_packet",
          "confidenceTier": "aculeus_synthesis_from_source_packet",
          "retrievalMethod": "Loaded from the Aculeus local source workspace for this demo packet.",
          "chainOfCustodyNote": "Demo packet records the source handle and missing public verification step; final claims stay held until public records are opened."
        }
      ],
      "lanes": [
        {
          "laneId": "lead",
          "label": "Question received",
          "headline": "The infrastructure question enters.",
          "body": "The user asks whether technical service became political infrastructure.",
          "state": "complete",
          "sourceIds": [
            "grid_dossier"
          ]
        },
        {
          "laneId": "finance",
          "label": "Finance opened",
          "headline": "Federal money changes the scale.",
          "body": "Award signals and financial filings become the first layer.",
          "state": "complete",
          "sourceIds": [
            "grid_federal_awards",
            "grid_financials"
          ]
        },
        {
          "laneId": "admin",
          "label": "Admin model mapped",
          "headline": "Prime-awardee role surfaces.",
          "body": "The agent finds where fees, sub-recipients, and program control meet.",
          "state": "complete",
          "sourceIds": [
            "grid_financials"
          ]
        },
        {
          "laneId": "partners",
          "label": "Partners linked",
          "headline": "The ecosystem appears.",
          "body": "Housing, advocacy, workforce, and civic partners become the network map.",
          "state": "running",
          "sourceIds": [
            "grid_partnerships"
          ]
        },
        {
          "laneId": "field",
          "label": "Field checked",
          "headline": "The ground operation matters.",
          "body": "Door-to-door, workforce, and trusted-messenger records become decisive.",
          "state": "running",
          "sourceIds": [
            "grid_field_operations"
          ]
        },
        {
          "laneId": "gaps",
          "label": "Gaps named",
          "headline": "The proof records are clear.",
          "body": "Award agreements, MOUs, logs, scripts, and outcomes decide the claim.",
          "state": "queued",
          "sourceIds": [
            "grid_dossier"
          ]
        },
        {
          "laneId": "action",
          "label": "Dispatch ready",
          "headline": "Request path generated.",
          "body": "The agent drafts the first records request.",
          "state": "queued",
          "sourceIds": [
            "grid_federal_awards",
            "grid_partnerships"
          ]
        }
      ],
      "nextRecords": [
        {
          "priority": "High",
          "recordId": "grid_award_packet",
          "holder": "GRID Alternatives and federal program custodians",
          "request": "Please provide federal award agreements, amendments, administrative fee schedules, sub-recipient lists, deliverables, monitoring records, and performance reports for GRID Alternatives climate funding program lanes.",
          "reason": "This tests the financial catalyst and prime-awardee model."
        },
        {
          "priority": "High",
          "recordId": "grid_field_packet",
          "holder": "GRID Alternatives and partner organizations",
          "request": "Please provide partner MOUs, field-operation plans, outreach scripts, field logs, training materials, civic-engagement boundaries, and outcome records.",
          "reason": "This tests whether technical service delivery became broader field infrastructure."
        }
      ],
      "actions": {
        "directMove": "Request the award packet and field-operation packet.",
        "recordHolder": "GRID Alternatives, EPA/DOE custodians, and partner organizations",
        "requestLanguage": "Please provide award agreements, amendments, administrative-fee schedules, sub-recipient lists, partner MOUs, field-operation plans, outreach scripts, training materials, monitoring reports, deliverables, performance outcomes, and civic-engagement boundaries for GRID Alternatives program lanes.",
        "ifRefused": "Ask for record indexes, exemption basis, and custodian by program lane.",
        "briefTargets": [
          "Reviewer",
          "Records counsel",
          "Coalition lead"
        ],
        "coalitionPath": "Brief the case as infrastructure: money, administrator role, partner network, field operation, missing records."
      }
    },
    {
      "caseId": "sf_homelessness_system",
      "displayId": "SF-001",
      "caseType": "system_review",
      "caseScope": "city_system",
      "title": "San Francisco homelessness system review",
      "headline": "San Francisco spends. The street still answers.",
      "lead": "Open San Francisco homelessness spending, contracts, providers, outcomes, and the monitoring records that decide what happened.",
      "summary": "Aculeus opens the public-record trail across money, agencies, providers, outcomes, missing proof, and direct next steps.",
      "jurisdiction": "San Francisco, California",
      "reviewStatus": "source_backed_lead",
      "publicLabel": "public_system_review",
      "legalBoundary": "The record supports a system-review lead. It does not make a final finding. The missing monitoring, invoice, corrective-action, and outcome records decide the next move.",
      "caseScore": 94,
      "model": {
        "name": "Aculeus SLM",
        "version": "demo-adapter-0.3",
        "mode": "demo_ready",
        "endpoint": "/api/investigate"
      },
      "commandCenter": {
        "break": "Public money, provider contracts, and visible outcomes do not explain each other yet.",
        "proof": [
          "Official San Francisco payment data can show which providers and agencies sit in the money trail.",
          "Board, contract, and department records can show what the city approved and what providers promised.",
          "Outcome reports and monitoring files decide whether the work matched the public claim."
        ],
        "missing": "Contracts, amendments, invoices, monitoring letters, corrective actions, and provider-level outcome records for the same period.",
        "move": "Demand the missing records, assign a reviewer, brief the coalition, and track every response."
      },
      "entities": [
        {
          "name": "San Francisco Department of Homelessness and Supportive Housing",
          "role": "Agency",
          "confidence": 96
        },
        {
          "name": "San Francisco Board and committee records",
          "role": "Approval trail",
          "confidence": 93
        },
        {
          "name": "Homelessness-service providers",
          "role": "Provider universe",
          "confidence": 88
        },
        {
          "name": "San Francisco public data portals",
          "role": "Payment and outcome source families",
          "confidence": 92
        }
      ],
      "sourceFamilies": [
        "Payment rows",
        "Board approvals",
        "Contracts and amendments",
        "Monitoring letters",
        "Corrective actions",
        "Outcome reports",
        "Public-record request logs"
      ],
      "dossier": {
        "title": "San Francisco homelessness nonprofit complex",
        "deck": "The record is not complete. The next move is.",
        "summary": "Aculeus screened 15 San Francisco homelessness nonprofits. The dossier holds public payments, official notices or audits for some providers, 36 public receipts, and 75 public-record gaps that still decide the full review.",
        "posture": "Review lead, not a verdict",
        "caseUrl": "cases/live_ca_sf_homelessness_complex/",
        "stats": [
          {
            "label": "Providers screened",
            "value": "15",
            "detail": "San Francisco homelessness nonprofit universe"
          },
          {
            "label": "Public receipts",
            "value": "36",
            "detail": "Source-linked records recovered"
          },
          {
            "label": "Record gaps",
            "value": "75",
            "detail": "Contracts, monitoring, outcome, and backup records still needed"
          },
          {
            "label": "Source links",
            "value": "16",
            "detail": "Public source links passed citation checks"
          }
        ],
        "findings": [
          {
            "findingId": "sf-uch-violation",
            "entity": "United Council of Human Services",
            "signal": "Official city notice",
            "whatRecordSays": "San Francisco issued an official notice that United Council of Human Services was found to be in violation of City agreements.",
            "whyItMatters": "This moves the case from broad concern to a source-backed review lead.",
            "whatItDoesNotProve": "It does not decide fraud, intent, or final liability.",
            "nextRecord": "Contracts, amendments, monitoring letters, corrective-action status, and payment backup.",
            "sourceFamily": "Official enforcement or docket source",
            "sourceUrl": "https://www.sf.gov/news--united-council-human-services-found-be-violation-city-agreements",
            "sourceIds": [
              "sf_hsh_contracts",
              "sf_board_files"
            ]
          },
          {
            "findingId": "sf-homerise-audit",
            "entity": "Community Housing Partnership / HomeRise",
            "signal": "Controller audit",
            "whatRecordSays": "A San Francisco Controller announcement and audit report identify HomeRise, formerly Community Housing Partnership, as the provider in an audit of City-funded housing for unhoused residents.",
            "whyItMatters": "An audit signal gives the agent a real source path, not a loose narrative.",
            "whatItDoesNotProve": "It does not prove every contract failed or that every payment was improper.",
            "nextRecord": "Audit report, provider response, contract files, monitoring history, corrective-action status, and closeout records.",
            "sourceFamily": "Official audit source",
            "sourceUrl": "https://www.sf.gov/news--audit-finds-one-citys-providers-housing-unhoused-residents-had-serious-financial-shortfalls",
            "sourceIds": [
              "sf_controller_reports",
              "sf_hsh_contracts"
            ]
          },
          {
            "findingId": "sf-tndc-990",
            "entity": "Tenderloin Neighborhood Development Corp",
            "signal": "Matched IRS filing",
            "whatRecordSays": "Latest matched Form 990 filing for Tenderloin Neighborhood Development Corp: Employer Identification Number 942761808, tax period year 2023.",
            "whyItMatters": "The entity identity is anchored before the agent touches contracts, payments, or outcomes.",
            "whatItDoesNotProve": "An entity filing is a receipt, not a misconduct finding.",
            "nextRecord": "Contracts, grant agreements, payment backup, provider-level outcomes, and monitoring records for the matched entity.",
            "sourceFamily": "IRS Form 990 record",
            "sourceUrl": "https://apps.irs.gov/pub/epostcard/990/xml/2024/2024_TEOS_XML_11A.zip",
            "sourceIds": [
              "sf_hsh_contracts"
            ]
          },
          {
            "findingId": "sf-providence-990",
            "entity": "Providence Foundation of San Francisco",
            "signal": "Matched IRS filing",
            "whatRecordSays": "Latest matched Form 990 filing for Providence Foundation of San Francisco: Employer Identification Number 931204173, tax period year 2023.",
            "whyItMatters": "A clean entity match keeps the review tied to a real public record.",
            "whatItDoesNotProve": "It does not decide performance or contract compliance.",
            "nextRecord": "Contract packet, payment records, monitoring letters, and provider outcome support.",
            "sourceFamily": "IRS Form 990 record",
            "sourceUrl": "https://apps.irs.gov/pub/epostcard/990/xml/2024/2024_TEOS_XML_11A.zip",
            "sourceIds": [
              "sf_hsh_contracts"
            ]
          }
        ],
        "entityFolders": [
          {
            "entity": "United Council of Human Services",
            "receipts": 2,
            "signal": "Official violation notice plus matched filing",
            "gap": "Agreement files, monitoring record, corrective-action status, payment backup",
            "nextMove": "Open the city notice, then request the contract and monitoring packet."
          },
          {
            "entity": "Community Housing Partnership / HomeRise",
            "receipts": 7,
            "signal": "Controller audit signal plus matched filing",
            "gap": "Audit workpapers, provider response, closeout, contract history",
            "nextMove": "Request the audit packet and matching contract files."
          },
          {
            "entity": "Tenderloin Housing Clinic Inc",
            "receipts": 2,
            "signal": "Entity and payment-review folder opened",
            "gap": "Contract purpose, invoices, monitoring letters, outcome support",
            "nextMove": "Request provider-level payment backup and monitoring records."
          },
          {
            "entity": "Tenderloin Neighborhood Development Corp",
            "receipts": 3,
            "signal": "Matched Form 990 and source page",
            "gap": "Contract packet and provider outcomes",
            "nextMove": "Match the filing to contracts, payments, and performance records."
          }
        ],
        "sourceGroups": [
          {
            "label": "Official notices and audits",
            "status": "Opened",
            "detail": "City notice and Controller audit signals create the strongest review leads."
          },
          {
            "label": "IRS and entity filings",
            "status": "Opened",
            "detail": "Entity matches keep names, IDs, and filing periods tied to real records."
          },
          {
            "label": "Payment and award records",
            "status": "Partial",
            "detail": "Money exposure helps rank review value but does not prove performance."
          },
          {
            "label": "Contracts and monitoring",
            "status": "Missing",
            "detail": "These records decide whether the public claim can move."
          },
          {
            "label": "Provider outcomes",
            "status": "Missing",
            "detail": "Outcome records connect public money to public results."
          }
        ],
        "nextMoves": [
          "Request contract packets for the named providers: agreements, amendments, invoices, payment backup, monitoring letters, corrective-action status, and closeout records.",
          "Match every payment row to a contract purpose, date range, deliverable, reviewer, and outcome record.",
          "Route official notice and audit signals to human review before any public claim is drafted.",
          "Build a coalition brief only after missing records are logged, reviewed, and citation-safe."
        ]
      },
      "claims": [
        {
          "title": "This is a system case, not a single-record case.",
          "body": "The lead starts with a visible public failure and opens the record families that can prove where money, obligations, outcomes, and missing records meet.",
          "state": "Supported as case scope",
          "sourceIds": [
            "sf_hsh_profile",
            "sf_payments",
            "sf_board_files"
          ],
          "confidence": 84
        },
        {
          "title": "The next proof lives in matching records.",
          "body": "Payments alone do not prove performance. The system needs contract purpose, invoices, deliverables, monitoring files, corrective actions, and provider-level outcomes for the same period.",
          "state": "Supported as proof requirement",
          "sourceIds": [
            "sf_hsh_contracts",
            "sf_controller_reports",
            "sf_hsh_data_hub"
          ],
          "confidence": 87
        },
        {
          "title": "The action is direct.",
          "body": "The case can move now by requesting the exact document families held by the city and routing the response to a reviewer and coalition brief.",
          "state": "Ready for action",
          "sourceIds": [
            "sf_board_files",
            "sf_hsh_contracts"
          ],
          "confidence": 82
        }
      ],
      "sources": [
        {
          "sourceId": "sf_hsh_profile",
          "title": "San Francisco Homelessness NGO Review Value Profile",
          "type": "investigation_profile",
          "publisher": "Aculeus case workspace",
          "role": "Case scope and source map",
          "retrievedAt": "2026-05-14",
          "confidence": "internal_profile",
          "visibility": "internal",
          "url": "data/investigation_profiles/sf_homelessness.json",
          "hash": "profile-sf-homelessness-review-value-v1",
          "excerpt": "The profile defines the target universe, source families, public-record connectors, evidence-store policy, and human action rules for a San Francisco homelessness review.",
          "limitation": "A profile is a map, not proof. It tells Aculeus what records to open and what not to claim yet.",
          "publisherType": "aculeus_case_profile",
          "recordDate": "2026-05-14",
          "canonicalUrl": null,
          "localArtifactPath": "data/source-packets/sf_hsh_profile.md",
          "documentId": "profile-sf-homelessness-review-value-v1",
          "pageOrRowLocator": "Local case profile, provider and receipt index",
          "quotedExcerpt": "The profile defines the target universe, source families, public-record connectors, evidence-store policy, and human action rules for a San Francisco homelessness review.",
          "excerptLocator": "Local case profile, provider and receipt index",
          "verificationStatus": "local_profile",
          "confidenceTier": "aculeus_synthesis_from_source_packet",
          "retrievalMethod": "Loaded from the Aculeus local source workspace for this demo packet.",
          "chainOfCustodyNote": "Demo packet records the source handle and missing public verification step; final claims stay held until public records are opened."
        },
        {
          "sourceId": "sf_payments",
          "title": "San Francisco Open Data payment rows",
          "type": "payment_ledger",
          "publisher": "San Francisco Open Data",
          "role": "Payment exposure source family",
          "retrievedAt": "2026-05-14",
          "confidence": "public_record_family",
          "visibility": "public",
          "url": "https://data.sfgov.org/resource/qkex-vh98.json",
          "hash": "sf-open-data-payments-source-family",
          "excerpt": "Payment rows can identify supplier payment exposure and help seed provider and agency review.",
          "limitation": "Payment exposure does not prove misuse, performance, or direct service outcome without contract and monitoring records.",
          "publisherType": "public_dataset",
          "recordDate": "2026-05-14",
          "canonicalUrl": "https://data.sfgov.org/resource/qkex-vh98.json",
          "localArtifactPath": null,
          "documentId": "sf-open-data-payments-source-family",
          "pageOrRowLocator": "SF Open Data rows filtered by provider and payment fields",
          "quotedExcerpt": "Payment rows can identify supplier payment exposure and help seed provider and agency review.",
          "excerptLocator": "SF Open Data rows filtered by provider and payment fields",
          "verificationStatus": "publicly_verifiable",
          "confidenceTier": "primary_or_official_record",
          "retrievalMethod": "Public URL opened by the Aculeus source run.",
          "chainOfCustodyNote": "Public source can be opened from the receipt drawer; Aculeus still keeps a trace id for repeat review."
        },
        {
          "sourceId": "sf_board_files",
          "title": "San Francisco board and committee files",
          "type": "approval_record",
          "publisher": "San Francisco Legislative Research Center and Legistar",
          "role": "Approval and contract trail",
          "retrievedAt": "2026-05-14",
          "confidence": "public_record_family",
          "visibility": "public",
          "url": "https://www.sf.gov/legislative-research-center-lrc",
          "hash": "sf-board-files-source-family",
          "excerpt": "Board files, resolutions, staff reports, and contract approval attachments can show what was approved and why.",
          "limitation": "Approval files must be matched to contract text, amendments, invoices, and monitoring history.",
          "publisherType": "official_record_index",
          "recordDate": "2026-05-14",
          "canonicalUrl": "https://www.sf.gov/legislative-research-center-lrc",
          "localArtifactPath": null,
          "documentId": "sf-board-files-source-family",
          "pageOrRowLocator": "Legislative record index, board and committee file search",
          "quotedExcerpt": "Board files, resolutions, staff reports, and contract approval attachments can show what was approved and why.",
          "excerptLocator": "Legislative record index, board and committee file search",
          "verificationStatus": "publicly_verifiable",
          "confidenceTier": "primary_or_official_record",
          "retrievalMethod": "Public URL opened by the Aculeus source run.",
          "chainOfCustodyNote": "Public source can be opened from the receipt drawer; Aculeus still keeps a trace id for repeat review."
        },
        {
          "sourceId": "sf_hsh_contracts",
          "title": "San Francisco HSH contract and monitoring files",
          "type": "contract_monitoring",
          "publisher": "San Francisco Department of Homelessness and Supportive Housing",
          "role": "Contract, invoice, monitoring, and corrective-action trail",
          "retrievedAt": "2026-05-14",
          "confidence": "public_or_request_record_family",
          "visibility": "public_or_records_request",
          "url": "https://www.sf.gov/departments/homelessness-and-supportive-housing",
          "hash": "sf-hsh-contract-monitoring-source-family",
          "excerpt": "Contracts, amendments, invoices, monitoring letters, and corrective actions decide whether payment, scope, and performance line up.",
          "limitation": "Some files may require targeted public-record requests.",
          "publisherType": "official_agency_records",
          "recordDate": "2026-05-14",
          "canonicalUrl": "https://www.sf.gov/departments/homelessness-and-supportive-housing",
          "localArtifactPath": null,
          "documentId": "sf-hsh-contract-monitoring-source-family",
          "pageOrRowLocator": "HSH department records, contracts and monitoring pages",
          "quotedExcerpt": "Contracts, amendments, invoices, monitoring letters, and corrective actions decide whether payment, scope, and performance line up.",
          "excerptLocator": "HSH department records, contracts and monitoring pages",
          "verificationStatus": "publicly_verifiable",
          "confidenceTier": "record_support",
          "retrievalMethod": "Public URL opened by the Aculeus source run.",
          "chainOfCustodyNote": "Public source can be opened from the receipt drawer; Aculeus still keeps a trace id for repeat review."
        },
        {
          "sourceId": "sf_controller_reports",
          "title": "San Francisco Controller reports",
          "type": "audit_report",
          "publisher": "San Francisco Office of the Controller",
          "role": "Audit and performance context",
          "retrievedAt": "2026-05-14",
          "confidence": "public_record_family",
          "visibility": "public",
          "url": "https://www.sf.gov/departments/city-administrator/office-controller",
          "hash": "sf-controller-reports-source-family",
          "excerpt": "Controller audits, performance reports, and recommendation status can frame what the city already knows.",
          "limitation": "Audit context does not replace provider-level contract, invoice, and outcome records.",
          "publisherType": "official_audit_source",
          "recordDate": "2026-05-14",
          "canonicalUrl": "https://www.sf.gov/departments/city-administrator/office-controller",
          "localArtifactPath": null,
          "documentId": "sf-controller-reports-source-family",
          "pageOrRowLocator": "Controller report index, audit and performance reports",
          "quotedExcerpt": "Controller audits, performance reports, and recommendation status can frame what the city already knows.",
          "excerptLocator": "Controller report index, audit and performance reports",
          "verificationStatus": "publicly_verifiable",
          "confidenceTier": "primary_or_official_record",
          "retrievalMethod": "Public URL opened by the Aculeus source run.",
          "chainOfCustodyNote": "Public source can be opened from the receipt drawer; Aculeus still keeps a trace id for repeat review."
        },
        {
          "sourceId": "sf_hsh_data_hub",
          "title": "San Francisco homelessness data hub and archived reports",
          "type": "outcome_record",
          "publisher": "San Francisco HSH archived reports",
          "role": "Outcome and system context",
          "retrievedAt": "2026-05-14",
          "confidence": "public_record_family",
          "visibility": "public",
          "url": "https://hsh.archive.sf.gov/",
          "hash": "sf-hsh-data-hub-source-family",
          "excerpt": "Outcome records and system reports help test whether spending, contracts, and public results tell the same story.",
          "limitation": "System-level outcomes must be tied carefully to provider and contract scope before any public claim moves.",
          "publisherType": "official_data_hub",
          "recordDate": "2026-05-14",
          "canonicalUrl": "https://hsh.archive.sf.gov/",
          "localArtifactPath": null,
          "documentId": "sf-hsh-data-hub-source-family",
          "pageOrRowLocator": "Archived data hub, dashboards and outcome reports",
          "quotedExcerpt": "Outcome records and system reports help test whether spending, contracts, and public results tell the same story.",
          "excerptLocator": "Archived data hub, dashboards and outcome reports",
          "verificationStatus": "publicly_verifiable",
          "confidenceTier": "primary_or_official_record",
          "retrievalMethod": "Public URL opened by the Aculeus source run.",
          "chainOfCustodyNote": "Public source can be opened from the receipt drawer; Aculeus still keeps a trace id for repeat review."
        }
      ],
      "lanes": [
        {
          "laneId": "lead",
          "label": "Lead received",
          "headline": "A city-scale failure enters.",
          "body": "The lead is not one invoice. It is a public system with money, providers, promises, outcomes, and missing proof.",
          "state": "complete",
          "sourceIds": [
            "sf_hsh_profile"
          ]
        },
        {
          "laneId": "sources",
          "label": "Sources opened",
          "headline": "The record families appear.",
          "body": "Aculeus opens the official source families first: payments, board files, contracts, monitoring records, audits, and outcomes.",
          "state": "complete",
          "sourceIds": [
            "sf_payments",
            "sf_board_files",
            "sf_hsh_contracts"
          ]
        },
        {
          "laneId": "money",
          "label": "Money trail found",
          "headline": "Payment exposure gets mapped.",
          "body": "Supplier payment rows and contract approvals become a review map, not a final accusation.",
          "state": "complete",
          "sourceIds": [
            "sf_payments",
            "sf_board_files"
          ]
        },
        {
          "laneId": "network",
          "label": "Network connected",
          "headline": "Agencies and providers line up.",
          "body": "The case connects agency records, provider records, contract obligations, and public performance context.",
          "state": "complete",
          "sourceIds": [
            "sf_hsh_contracts",
            "sf_controller_reports"
          ]
        },
        {
          "laneId": "outcomes",
          "label": "Outcome gap surfaced",
          "headline": "The public result must match the record.",
          "body": "Outcome reports and provider records decide whether the work matched the promise.",
          "state": "running",
          "sourceIds": [
            "sf_hsh_data_hub",
            "sf_controller_reports"
          ]
        },
        {
          "laneId": "missing",
          "label": "Missing proof named",
          "headline": "The decisive records are clear.",
          "body": "Contracts, amendments, invoices, monitoring letters, corrective actions, and provider outcomes are the records that move this case.",
          "state": "queued",
          "sourceIds": [
            "sf_hsh_contracts"
          ]
        },
        {
          "laneId": "action",
          "label": "Action generated",
          "headline": "The next move is ready.",
          "body": "Aculeus turns the record trail into request language, reviewer assignment, escalation, and coalition briefing.",
          "state": "queued",
          "sourceIds": [
            "sf_hsh_contracts",
            "sf_board_files"
          ]
        }
      ],
      "universe": [
        {
          "nodeId": "agency",
          "label": "Agency",
          "title": "SF HSH",
          "type": "agency",
          "x": 14,
          "y": 44,
          "sourceIds": [
            "sf_hsh_contracts"
          ]
        },
        {
          "nodeId": "payments",
          "label": "Money",
          "title": "Payment rows",
          "type": "money",
          "x": 31,
          "y": 28,
          "sourceIds": [
            "sf_payments"
          ]
        },
        {
          "nodeId": "contracts",
          "label": "Contracts",
          "title": "Approvals and amendments",
          "type": "contract",
          "x": 51,
          "y": 46,
          "sourceIds": [
            "sf_board_files",
            "sf_hsh_contracts"
          ]
        },
        {
          "nodeId": "providers",
          "label": "Providers",
          "title": "Service provider universe",
          "type": "provider",
          "x": 70,
          "y": 29,
          "sourceIds": [
            "sf_hsh_contracts"
          ]
        },
        {
          "nodeId": "outcomes",
          "label": "Outcomes",
          "title": "System and provider results",
          "type": "outcome",
          "x": 83,
          "y": 57,
          "sourceIds": [
            "sf_hsh_data_hub"
          ]
        },
        {
          "nodeId": "missing",
          "label": "Missing proof",
          "title": "Monitoring files",
          "type": "missing",
          "x": 58,
          "y": 72,
          "sourceIds": [
            "sf_hsh_contracts"
          ]
        },
        {
          "nodeId": "action",
          "label": "Action",
          "title": "Request and brief",
          "type": "action",
          "x": 34,
          "y": 72,
          "sourceIds": [
            "sf_hsh_contracts",
            "sf_board_files"
          ]
        }
      ],
      "anomalyMath": [
        {
          "label": "Review value",
          "metric": "source_families_required",
          "observed": 7,
          "baseline": 1,
          "ratio": 7,
          "calculation": "7 source families must line up before the case can move from concern to proof.",
          "confidence": 0.84,
          "limitation": "This is not a fraud score. It is the map of records required for a reviewer to decide what holds."
        }
      ],
      "nextRecords": [
        {
          "priority": "High",
          "recordId": "sf_hsh_contract_packet",
          "holder": "San Francisco Department of Homelessness and Supportive Housing",
          "request": "Contracts, amendments, invoices, deliverables, monitoring letters, corrective actions, and provider-level outcome records for the target provider set and review period.",
          "reason": "These records decide whether payments, contract purpose, deliverables, monitoring, and outcomes tell the same story."
        },
        {
          "priority": "High",
          "recordId": "sf_board_approval_packet",
          "holder": "San Francisco Legislative Research Center and Legistar",
          "request": "Board files, resolutions, staff reports, approval attachments, and amendments tied to the target contracts.",
          "reason": "Approval records show what the city authorized and what the public was told."
        },
        {
          "priority": "Medium",
          "recordId": "provider_outcome_packet",
          "holder": "San Francisco HSH and named providers",
          "request": "Provider-level outcome reports, performance dashboards, corrective-action status, and closeout records.",
          "reason": "Outcome records connect public spending to public results."
        }
      ],
      "actions": {
        "directMove": "Demand the records that connect money, contracts, monitoring, and outcomes.",
        "recordHolder": "San Francisco HSH, board file custodians, and provider contract administrators",
        "requestLanguage": "Please provide contracts, amendments, invoices, deliverables, monitoring letters, corrective actions, payment backup, and provider-level outcome records connected to San Francisco homelessness-service contracts for the identified providers and review period. Please include record indexes, approval attachments, amendments, payment backup, monitoring findings, corrective-action status, and any closeout or performance records.",
        "ifRefused": "Log the refusal, ask for the exemption and record index, narrow by provider and date range, then escalate to the city records custodian and coalition counsel.",
        "briefTargets": [
          "Reviewer",
          "Coalition lead",
          "Records counsel",
          "Public accountability partner"
        ],
        "coalitionPath": "Turn the source trail into a short public brief only after the missing records are logged, reviewed, and citation-safe.",
        "decisionTree": [
          {
            "state": "Records arrive clean",
            "move": "Close the lead or reroute to a better target."
          },
          {
            "state": "Records arrive incomplete",
            "move": "Request the missing index, attachments, and monitoring file."
          },
          {
            "state": "Records show a break",
            "move": "Build a public-safe brief and assign human review."
          },
          {
            "state": "Records are refused",
            "move": "Escalate the request and brief the coalition on the blockage."
          }
        ]
      },
      "outputs": [
        {
          "title": "System map",
          "status": "Ready",
          "body": "Evidence lanes connect money, sources, providers, outcomes, missing proof, and action."
        },
        {
          "title": "Record request",
          "status": "Ready",
          "body": "Copy-ready request language is prepared for the exact missing document families."
        },
        {
          "title": "Coalition brief",
          "status": "Queued",
          "body": "Brief only after the missing records are logged and source-safe."
        }
      ],
      "runSteps": [
        {
          "label": "Lead received",
          "body": "The case starts as a city-scale public-record lead.",
          "state": "complete"
        },
        {
          "label": "Sources opened",
          "body": "Payments, board files, contracts, monitoring, audits, and outcomes enter the run.",
          "state": "complete"
        },
        {
          "label": "Money trail found",
          "body": "Payment exposure and approvals become a review map.",
          "state": "complete"
        },
        {
          "label": "Network connected",
          "body": "Agencies, providers, contracts, and outcomes line up for inspection.",
          "state": "complete"
        },
        {
          "label": "Missing proof named",
          "body": "Contracts, invoices, monitoring letters, corrective actions, and outcome records are the decisive proof.",
          "state": "complete"
        },
        {
          "label": "Action generated",
          "body": "Aculeus drafts the record request and next-step path.",
          "state": "queued"
        }
      ]
    },
    {
      "caseId": "ca_homelessness_top15",
      "displayId": "CA-015",
      "caseType": "target_ranking",
      "caseScope": "statewide_review",
      "title": "California homelessness top 15 review",
      "headline": "Rank the targets that deserve review.",
      "lead": "Rank California homelessness-service nonprofit candidates by review value using awards, payment exposure, official adverse records, source opacity, and outcome context.",
      "summary": "Aculeus turns a statewide source universe into a ranked review board and names the records needed for each target.",
      "jurisdiction": "California",
      "reviewStatus": "target_ranking_ready",
      "publicLabel": "statewide_review_board",
      "legalBoundary": "The board ranks review value, not guilt. Each target still needs record-level human review.",
      "caseScore": 89,
      "model": {
        "name": "Aculeus SLM",
        "version": "demo-adapter-0.3",
        "mode": "demo_ready",
        "endpoint": "/api/investigate"
      },
      "commandCenter": {
        "break": "The strongest target is not always the biggest dollar figure.",
        "proof": [
          "Award exposure seeds the universe.",
          "Official adverse records and source opacity change the review value.",
          "Outcome and monitoring records decide what moves."
        ],
        "missing": "County contracts, payment ledgers, provider outcome records, monitoring files, and corrective-action status.",
        "move": "Open the ranked targets one by one and demand the missing record packet for each."
      },
      "entities": [
        {
          "name": "Hope the Mission",
          "role": "Review target",
          "confidence": 85
        },
        {
          "name": "Weingart Center Association",
          "role": "Review target",
          "confidence": 86
        },
        {
          "name": "DignityMoves",
          "role": "Review target",
          "confidence": 84
        },
        {
          "name": "The People Concern",
          "role": "Review target",
          "confidence": 84
        },
        {
          "name": "California Supportive Housing",
          "role": "Review target",
          "confidence": 82
        }
      ],
      "sourceFamilies": [
        "State awards",
        "IRS filings",
        "Federal audits",
        "County contracts",
        "Outcome reports",
        "Entity registries"
      ],
      "dossier": {
        "title": "California homelessness nonprofit triage",
        "deck": "The board ranks review value. It does not declare guilt.",
        "summary": "Aculeus screened 15 California homelessness nonprofits. The dossier shows large state housing-award exposure, one official federal charging announcement tied to a connected property transaction, and 25 public-record gaps still needed before any final conclusion.",
        "posture": "Target ranking, not a verdict",
        "caseUrl": "cases/live_ca_homelessness_top15_2026_04_29/",
        "stats": [
          {
            "label": "Targets screened",
            "value": "15",
            "detail": "Statewide homelessness nonprofit universe"
          },
          {
            "label": "Public receipts",
            "value": "16",
            "detail": "Source-backed records recovered"
          },
          {
            "label": "Record gaps",
            "value": "25",
            "detail": "Target packets still needed"
          },
          {
            "label": "Source links",
            "value": "9",
            "detail": "Public source links passed citation checks"
          }
        ],
        "findings": [
          {
            "findingId": "ca-hope-exposure",
            "entity": "Hope the Mission",
            "signal": "State award exposure",
            "whatRecordSays": "Hope the Mission has $115,337,991 in California Department of Housing and Community Development award-list exposure across 5 project entries.",
            "whyItMatters": "Large exposure makes it a high-value review target when matched to contracts, monitoring, and outcomes.",
            "whatItDoesNotProve": "Award exposure is not wrongdoing.",
            "nextRecord": "Homekey contracts, payment records, monitoring files, corrective actions, deliverables, and outcome support.",
            "sourceFamily": "California housing-award record",
            "sourceUrl": "https://www.hcd.ca.gov/funding/homekey/funding-overview",
            "sourceIds": [
              "ca_profile"
            ]
          },
          {
            "findingId": "ca-weingart-exposure",
            "entity": "Weingart Center Association",
            "signal": "State award exposure plus enforcement-source trigger",
            "whatRecordSays": "Weingart Center Association has $95,565,300 in California Department of Housing and Community Development award-list exposure across 3 project entries.",
            "whyItMatters": "Exposure plus a connected official enforcement source makes this a priority review path.",
            "whatItDoesNotProve": "It does not mean the organization committed a crime.",
            "nextRecord": "Project files, award backup, contracts, escrow-related public records where applicable, monitoring files, and outcome records.",
            "sourceFamily": "California housing-award record",
            "sourceUrl": "https://www.hcd.ca.gov/funding/homekey/funding-overview",
            "sourceIds": [
              "ca_profile"
            ]
          },
          {
            "findingId": "ca-dignitymoves-exposure",
            "entity": "DignityMoves",
            "signal": "State award exposure",
            "whatRecordSays": "DignityMoves has $77,180,702 in California Department of Housing and Community Development award-list exposure across 3 project entries.",
            "whyItMatters": "The target deserves review when award exposure is paired with missing contract and outcome records.",
            "whatItDoesNotProve": "It does not decide performance or misuse.",
            "nextRecord": "Standard agreements, payment ledgers, monitoring letters, corrective-action records, and deliverable ledgers.",
            "sourceFamily": "California housing-award record",
            "sourceUrl": "https://www.hcd.ca.gov/funding/homekey/funding-overview",
            "sourceIds": [
              "ca_profile"
            ]
          }
        ],
        "entityFolders": [
          {
            "entity": "Hope the Mission",
            "receipts": 3,
            "signal": "$115,337,991 award-list exposure",
            "gap": "Contracts, payments, monitoring, deliverables, outcomes",
            "nextMove": "Request the target packet for every listed project entry."
          },
          {
            "entity": "Weingart Center Association",
            "receipts": 3,
            "signal": "$95,565,300 award-list exposure and connected enforcement-source trigger",
            "gap": "Project files and monitoring packet",
            "nextMove": "Separate official charges from entity review, then request project records."
          },
          {
            "entity": "DignityMoves",
            "receipts": 3,
            "signal": "$77,180,702 award-list exposure",
            "gap": "Standard agreements and outcome support",
            "nextMove": "Tie award exposure to contracts, payments, and performance."
          }
        ],
        "sourceGroups": [
          {
            "label": "State awards",
            "status": "Opened",
            "detail": "Homekey exposure seeds the target universe."
          },
          {
            "label": "IRS filings",
            "status": "Opened",
            "detail": "Filing records anchor entity identity."
          },
          {
            "label": "Enforcement and dockets",
            "status": "Partial",
            "detail": "Official sources can trigger review, but must be attributed exactly."
          },
          {
            "label": "County contracts and monitoring",
            "status": "Missing",
            "detail": "These records decide whether the ranked target moves."
          }
        ],
        "nextMoves": [
          "Open one target at a time instead of scattering requests across the universe.",
          "Request contracts, payment ledgers, monitoring letters, corrective actions, deliverables, and outcome records for the selected target.",
          "Keep award exposure separate from wrongdoing claims.",
          "Promote a target only when public records and human review support it."
        ]
      },
      "claims": [
        {
          "title": "Ranking is a triage tool.",
          "body": "The case ranks review value so humans start where records are most likely to matter.",
          "state": "Supported as triage",
          "sourceIds": [
            "ca_profile"
          ],
          "confidence": 83
        }
      ],
      "sources": [
        {
          "sourceId": "ca_profile",
          "title": "California Statewide Homelessness Review Value Profile",
          "type": "investigation_profile",
          "publisher": "Aculeus case workspace",
          "role": "Ranking rules",
          "retrievedAt": "2026-05-14",
          "confidence": "internal_profile",
          "visibility": "internal",
          "url": "data/investigation_profiles/ca_statewide_homelessness.json",
          "hash": "profile-ca-statewide-homelessness-review-value-v1",
          "excerpt": "The profile ranks targets by public money exposure, adverse records, scope mismatch, outcome mismatch, source opacity, and verifiability.",
          "limitation": "Ranking creates review priority. It does not make a final finding.",
          "publisherType": "aculeus_case_profile",
          "recordDate": "2026-05-14",
          "canonicalUrl": null,
          "localArtifactPath": "data/source-packets/ca_profile.md",
          "documentId": "profile-ca-statewide-homelessness-review-value-v1",
          "pageOrRowLocator": "Local statewide profile, provider ranking and gap queue",
          "quotedExcerpt": "The profile ranks targets by public money exposure, adverse records, scope mismatch, outcome mismatch, source opacity, and verifiability.",
          "excerptLocator": "Local statewide profile, provider ranking and gap queue",
          "verificationStatus": "local_profile",
          "confidenceTier": "aculeus_synthesis_from_source_packet",
          "retrievalMethod": "Loaded from the Aculeus local source workspace for this demo packet.",
          "chainOfCustodyNote": "Demo packet records the source handle and missing public verification step; final claims stay held until public records are opened."
        }
      ],
      "lanes": [
        {
          "laneId": "lead",
          "label": "Universe seeded",
          "headline": "The target board opens.",
          "body": "Aculeus starts with a statewide provider universe.",
          "state": "complete",
          "sourceIds": [
            "ca_profile"
          ]
        },
        {
          "laneId": "sources",
          "label": "Sources opened",
          "headline": "Source families attach.",
          "body": "Awards, filings, audits, contracts, and outcomes become the review board.",
          "state": "complete",
          "sourceIds": [
            "ca_profile"
          ]
        },
        {
          "laneId": "money",
          "label": "Exposure ranked",
          "headline": "Dollars are only one signal.",
          "body": "Review value weights exposure alongside official records and source opacity.",
          "state": "complete",
          "sourceIds": [
            "ca_profile"
          ]
        },
        {
          "laneId": "network",
          "label": "Targets sorted",
          "headline": "Provider targets line up.",
          "body": "The board shows where human review should start.",
          "state": "running",
          "sourceIds": [
            "ca_profile"
          ]
        },
        {
          "laneId": "outcomes",
          "label": "Outcome check",
          "headline": "Public results enter.",
          "body": "Outcome context helps separate noise from review value.",
          "state": "queued",
          "sourceIds": [
            "ca_profile"
          ]
        },
        {
          "laneId": "missing",
          "label": "Packets named",
          "headline": "Missing records decide.",
          "body": "Each target needs contracts, monitoring, payment, and outcome records.",
          "state": "queued",
          "sourceIds": [
            "ca_profile"
          ]
        },
        {
          "laneId": "action",
          "label": "Review path",
          "headline": "The board becomes work.",
          "body": "Aculeus turns ranking into target packets and direct asks.",
          "state": "queued",
          "sourceIds": [
            "ca_profile"
          ]
        }
      ],
      "universe": [
        {
          "nodeId": "awards",
          "label": "Awards",
          "title": "State awards",
          "type": "money",
          "x": 16,
          "y": 45,
          "sourceIds": [
            "ca_profile"
          ]
        },
        {
          "nodeId": "targets",
          "label": "Targets",
          "title": "Top 15 providers",
          "type": "provider",
          "x": 43,
          "y": 32,
          "sourceIds": [
            "ca_profile"
          ]
        },
        {
          "nodeId": "records",
          "label": "Records",
          "title": "Official records",
          "type": "source",
          "x": 66,
          "y": 54,
          "sourceIds": [
            "ca_profile"
          ]
        },
        {
          "nodeId": "action",
          "label": "Action",
          "title": "Review packets",
          "type": "action",
          "x": 84,
          "y": 38,
          "sourceIds": [
            "ca_profile"
          ]
        }
      ],
      "anomalyMath": [
        {
          "label": "Review value",
          "metric": "ranking_signals",
          "observed": 8,
          "baseline": 1,
          "ratio": 8,
          "calculation": "8 review signals decide priority before a human spends time.",
          "confidence": 0.83,
          "limitation": "Ranking is not proof."
        }
      ],
      "nextRecords": [
        {
          "priority": "High",
          "recordId": "target_packets",
          "holder": "State and county record custodians",
          "request": "Target-by-target contract, payment, monitoring, corrective-action, and outcome packets.",
          "reason": "The board only becomes actionable when each target has matching records."
        }
      ],
      "actions": {
        "directMove": "Open the top-ranked target and request the missing packet.",
        "recordHolder": "State and county record custodians",
        "requestLanguage": "Please provide contracts, amendments, invoices, monitoring letters, corrective actions, payment backup, and outcome records for the listed homelessness-service provider and review period.",
        "ifRefused": "Narrow by provider, contract number, and date range, then request the record index and exemption basis.",
        "briefTargets": [
          "Reviewer",
          "Records counsel",
          "Coalition lead"
        ],
        "coalitionPath": "Use the ranked board to assign targets and avoid scattershot requests.",
        "decisionTree": [
          {
            "state": "Target clears",
            "move": "Move down the board."
          },
          {
            "state": "Target has gaps",
            "move": "Request missing packet."
          },
          {
            "state": "Target shows a break",
            "move": "Build review packet."
          }
        ]
      },
      "outputs": [
        {
          "title": "Ranked board",
          "status": "Ready",
          "body": "Targets sorted by review value."
        },
        {
          "title": "Record packets",
          "status": "Queued",
          "body": "Next records named by target."
        }
      ],
      "runSteps": [
        {
          "label": "Universe seeded",
          "body": "Statewide candidates enter the run.",
          "state": "complete"
        },
        {
          "label": "Targets ranked",
          "body": "Review value weights the source families.",
          "state": "complete"
        },
        {
          "label": "Packets named",
          "body": "The next records are ready by target.",
          "state": "queued"
        }
      ]
    },
    {
      "caseId": "provider_deep_dive",
      "displayId": "PD-101",
      "caseType": "provider_deep_dive",
      "caseScope": "entity_review",
      "title": "Provider deep dive",
      "headline": "One provider. Every record around it.",
      "lead": "Open a provider-level deep dive across contracts, payments, monitoring, corrective actions, outcomes, officers, and public filings.",
      "summary": "Aculeus takes one provider and opens the surrounding record universe without jumping beyond the sources.",
      "jurisdiction": "California",
      "reviewStatus": "provider_packet_ready",
      "publicLabel": "provider_record_review",
      "legalBoundary": "The provider deep dive is a source-backed review path. It does not claim wrongdoing without human review.",
      "caseScore": 86,
      "model": {
        "name": "Aculeus SLM",
        "version": "demo-adapter-0.3",
        "mode": "demo_ready",
        "endpoint": "/api/investigate"
      },
      "commandCenter": {
        "break": "The provider story is incomplete until money, contracts, monitoring, and outcomes match.",
        "proof": [
          "Provider identity is verified first.",
          "Contracts and payment records anchor the money trail.",
          "Monitoring and outcome records decide what the public can say."
        ],
        "missing": "Provider contract packet, monitoring file, corrective-action history, and outcome support.",
        "move": "Open the provider packet and demand the missing records."
      },
      "entities": [
        {
          "name": "Provider entity",
          "role": "Review target",
          "confidence": 88
        },
        {
          "name": "Contracting agency",
          "role": "Record holder",
          "confidence": 86
        },
        {
          "name": "Oversight source",
          "role": "Audit and monitoring context",
          "confidence": 83
        }
      ],
      "sourceFamilies": [
        "Entity registry",
        "IRS filings",
        "Contracts",
        "Payments",
        "Monitoring",
        "Outcomes"
      ],
      "claims": [
        {
          "title": "The provider review needs matching records.",
          "body": "Aculeus keeps the case inside records that can be matched by entity, period, and contract purpose.",
          "state": "Supported as workflow",
          "sourceIds": [
            "provider_workflow"
          ],
          "confidence": 82
        }
      ],
      "sources": [
        {
          "sourceId": "provider_workflow",
          "title": "Provider deep-dive source map",
          "type": "workflow_profile",
          "publisher": "Aculeus case workspace",
          "role": "Entity-level review map",
          "retrievedAt": "2026-05-14",
          "confidence": "internal_profile",
          "visibility": "internal",
          "url": "internal://aculeus/provider-deep-dive",
          "hash": "provider-deep-dive-source-map",
          "excerpt": "A provider deep dive ties entity identity, contracts, payments, monitoring, corrective actions, and outcomes to a single review path.",
          "limitation": "The workflow names the missing proof. Human review decides the public claim.",
          "publisherType": "aculeus_workflow_profile",
          "recordDate": "2026-05-14",
          "canonicalUrl": null,
          "localArtifactPath": "data/source-packets/provider_workflow.md",
          "documentId": "provider-deep-dive-source-map",
          "pageOrRowLocator": "Internal workflow map, provider deep-dive checklist",
          "quotedExcerpt": "A provider deep dive ties entity identity, contracts, payments, monitoring, corrective actions, and outcomes to a single review path.",
          "excerptLocator": "Internal workflow map, provider deep-dive checklist",
          "verificationStatus": "internal_workflow",
          "confidenceTier": "aculeus_synthesis_from_source_packet",
          "retrievalMethod": "Loaded from the Aculeus local source workspace for this demo packet.",
          "chainOfCustodyNote": "Demo packet records the source handle and missing public verification step; final claims stay held until public records are opened."
        }
      ],
      "lanes": [
        {
          "laneId": "lead",
          "label": "Provider named",
          "headline": "The entity enters.",
          "body": "The case starts with a provider, alias, filing, payment, or contract lead.",
          "state": "complete",
          "sourceIds": [
            "provider_workflow"
          ]
        },
        {
          "laneId": "sources",
          "label": "Identity checked",
          "headline": "The provider is verified.",
          "body": "Registries, filings, and contract names are matched before the case moves.",
          "state": "complete",
          "sourceIds": [
            "provider_workflow"
          ]
        },
        {
          "laneId": "money",
          "label": "Money opened",
          "headline": "Contracts and payments attach.",
          "body": "The money trail is anchored to record families, not model memory.",
          "state": "complete",
          "sourceIds": [
            "provider_workflow"
          ]
        },
        {
          "laneId": "network",
          "label": "Connections mapped",
          "headline": "People and agencies connect.",
          "body": "The graph shows who touches the provider record.",
          "state": "running",
          "sourceIds": [
            "provider_workflow"
          ]
        },
        {
          "laneId": "outcomes",
          "label": "Performance checked",
          "headline": "Outcomes enter the review.",
          "body": "The case checks whether outputs match obligations.",
          "state": "queued",
          "sourceIds": [
            "provider_workflow"
          ]
        },
        {
          "laneId": "missing",
          "label": "Proof named",
          "headline": "The packet is obvious.",
          "body": "Monitoring and corrective-action records decide the next move.",
          "state": "queued",
          "sourceIds": [
            "provider_workflow"
          ]
        },
        {
          "laneId": "action",
          "label": "Action ready",
          "headline": "The request writes itself.",
          "body": "Aculeus drafts the missing-record ask.",
          "state": "queued",
          "sourceIds": [
            "provider_workflow"
          ]
        }
      ],
      "universe": [
        {
          "nodeId": "provider",
          "label": "Provider",
          "title": "Target entity",
          "type": "provider",
          "x": 20,
          "y": 44,
          "sourceIds": [
            "provider_workflow"
          ]
        },
        {
          "nodeId": "agency",
          "label": "Agency",
          "title": "Contract holder",
          "type": "agency",
          "x": 46,
          "y": 28,
          "sourceIds": [
            "provider_workflow"
          ]
        },
        {
          "nodeId": "records",
          "label": "Records",
          "title": "Contract packet",
          "type": "source",
          "x": 68,
          "y": 56,
          "sourceIds": [
            "provider_workflow"
          ]
        },
        {
          "nodeId": "move",
          "label": "Action",
          "title": "Request proof",
          "type": "action",
          "x": 83,
          "y": 34,
          "sourceIds": [
            "provider_workflow"
          ]
        }
      ],
      "anomalyMath": [
        {
          "label": "Record depth",
          "metric": "required_record_families",
          "observed": 6,
          "baseline": 1,
          "ratio": 6,
          "calculation": "6 record families must match before the provider story moves.",
          "confidence": 0.82,
          "limitation": "Depth is not guilt."
        }
      ],
      "nextRecords": [
        {
          "priority": "High",
          "recordId": "provider_packet",
          "holder": "Contracting agency",
          "request": "Provider contracts, amendments, invoices, payment backup, monitoring files, corrective-action letters, and outcome support.",
          "reason": "The provider packet decides what the public record can support."
        }
      ],
      "actions": {
        "directMove": "Request the provider packet.",
        "recordHolder": "Contracting agency and provider contract administrator",
        "requestLanguage": "Please provide contracts, amendments, invoices, payment backup, monitoring letters, corrective-action records, and provider-level outcome support for the named provider and review period.",
        "ifRefused": "Ask for the record index, exemption basis, and narrowed production schedule.",
        "briefTargets": [
          "Reviewer",
          "Records counsel"
        ],
        "coalitionPath": "Brief only after the provider packet is reviewed.",
        "decisionTree": [
          {
            "state": "Packet complete",
            "move": "Review the record and close or escalate."
          },
          {
            "state": "Packet missing pieces",
            "move": "Request the exact missing family."
          },
          {
            "state": "Packet conflicts",
            "move": "Build a source-backed review brief."
          }
        ]
      },
      "outputs": [
        {
          "title": "Provider packet",
          "status": "Ready",
          "body": "The missing-record ask is ready."
        }
      ],
      "runSteps": [
        {
          "label": "Provider named",
          "body": "The entity lead enters the run.",
          "state": "complete"
        },
        {
          "label": "Records opened",
          "body": "Identity, money, and monitoring source families attach.",
          "state": "complete"
        },
        {
          "label": "Packet named",
          "body": "The next records are ready to request.",
          "state": "queued"
        }
      ]
    }
  ]
};
window.ACULEUS_DEMO_CASES = window.ACULEUS_DEMO_LIBRARY.cases;
window.ACULEUS_DEMO_CASE = window.ACULEUS_DEMO_CASES.find((demoCase) => demoCase.caseId === window.ACULEUS_DEMO_LIBRARY.defaultCaseId) || window.ACULEUS_DEMO_CASES[0];
