import { FastMCP } from "fastmcp";
import { z } from "zod";
import * as services from "./services/index.js";

// Define the CV data structure for Frank Goortani
const cvData = {
  profile: {
    name: "Frank Goortani",
    title: "Hands on Solution Architect | LLM, Web, Cloud, Mobile, Strategy",
    certifications: ["TOGAF", "PMP", "MCITP", "MCPD", "ITIL", "Certified Data Scientist"],
    email: "frank@goortani.com",
    url: "https://goortani.com",
    description: "Visionary technology executive and AI leader with over 25 years of experience driving strategic innovation in generative AI, intelligent automation, and cloud-native architectures. Proven track record in developing transformative solutions leveraging large language models (LLMs), advanced AI agents, and data-driven systems across startups and Fortune 500 enterprises. Highly adept at aligning complex technical strategies with organizational objectives, scaling high-performance teams, and accelerating business outcomes. Skilled in defining enterprise-wide architectural roadmaps, optimizing technology investments, and fostering environments that encourage innovation, agility, and measurable growth. Recognized thought leader in the AI domain, consistently delivering impactful solutions that shape the future of technology and industry."
  },
  skills: [
    "Distributed Systems, API platforms, Microservices, integrations, Workflow systems",
    "Generative AI, Large Language Models (LLMs), AI agents, AI automation, Machine Learning",
    "Reactive and Functional Programming in Go, Python, Java, Swift, Typescript and JavaScript",
    "Full-stack Development, DevOps, Product Management, Agile Project Management",
    "Mobile application development, Mobile architecture, Hybrid/Cross-Platform apps",
    "Requirement Analysis, Change Management, Stakeholder Communications, Technology Evangelism",
    "Business Presentations, Architectural Documentation, Research, POCs",
    "Data Modeling, Business Intelligence (BI), Data Warehouse Design, ETL tools",
    "Data Governance, Data Streams, Master Data Management (MDM), Reporting, Dashboards",
    "Automation, Data Science, Data Visualizations, Infographics"
  ],
  interests: [
    "Startups", "GoLang", "Python", "Typescript", "LangChain", "LLMs", "Microservices", "MCPs",
    "AI Agents", "Generative AI", "Cloud Computing", "Mobile Development"
  ],
  resume: {
    path: "media/Frank Goortani Resume--solution-architect-2024.pdf",
    url: "media/Frank Goortani Resume--solution-architect-2024.pdf"
  },
  picture: {
    path: "media/frankgoortani.png",
    url: "media/frankgoortani.png"
  },
  education: [
    {
      institution: "AmirKabir University",
      degree: "B.Sc. in Computer Software Engineering",
      year: "2001"
    },
    {
      institution: "AmirKabir University",
      degree: "M.Sc. in Management",
      year: "2003"
    },
    {
      institution: "John Hopkins University",
      degree: "Certified Data Scientist",
      year: "2015"
    },
    {
      institution: "Project Management Institute",
      degree: "PMP Certified",
      year: "2013"
    },
    {
      institution: "The Open Group Architecture Framework",
      degree: "TOGAF 9.1 Certified",
      year: "2013"
    },
    {
      institution: "Microsoft",
      degree: "MCPD - Web Application Development 2008 Certified",
      year: "2012"
    },
    {
      institution: "Microsoft",
      degree: "MCITP - Database Developer 2008 Certified",
      year: "2012"
    }
  ],
  links: [
    { name: "LinkedIn", url: "https://www.linkedin.com/in/frankgoortani/" },
    { name: "StackOverflow", url: "https://stackoverflow.com/users/1136641/frank-goortani" },
    { name: "Twitter", url: "https://twitter.com/FrankGoortani" },
    { name: "Medium", url: "https://medium.com/@FrankGoortani" },
    { name: "GitHub", url: "https://github.com/frankgoortani" },
    { name: "ProductHunt", url: "https://www.producthunt.com/@frankgoortani" },
    { name: "Wellfound", url: "https://wellfound.com/u/frank-goortani" }
  ],
  startups: [
    { name: "fasteroutcomes.com", year: "2025" },
    { name: "counta.ai", year: "2024" },
    { name: "maktub.com", year: "2018" },
    { name: "lastcall.cc", year: "2017" },
    { name: "loggir.com", year: "2016" },
    { name: "exclusivelistings.club", year: "2015" }
  ],
  experience: [
    {
      company: "Uber",
      period: "2021-now",
      title: "Solution Architect",
      highlights: [
        "Worked on UDE (User Data Extraction) and DSAR (Data Subject Access Request) Automation as mandates for Security and Privacy teams. The stack included Piper (similar to Airflow), Cadence (similar to Temporal), Python, Go, Microservices, Reactjs, FusionJS, GraphQL, gRPC, Kafka, MySQL, and Docstore.",
        "As part of EngSec, worked on an AI Decision Engine called ELLE that helped automate triaging and reviewing Engineering Review Documents in the context of Privacy and Security. The project won several internal recognition awards and was used across multiple sub-disciplines.",
        "Worked on the end-to-end design, implementation and maintenance of multiple MVP products including Uber Charter (high-capacity group rides), Uber Park (automated parking lots), and Uber Concierge (new conversation channel with agents).",
        "Designed the architecture of pieces of the above projects and written detailed ERD and PRD to follow the approval processes, interfacing Privacy and Security teams.",
        "Implemented Golang BE code following Uber Microservices MVCS design patterns, implementing APIs in gRPC, GraphQL and Rest protocols.",
        "Implemented detailed unit tests for the backend code in Go MonoRepo.",
        "Within GoLang Microservices, worked and integrated with MySQL, DocStore (Uber NoSQL document store), Kafka, Up (Uber deployment stack), USecret, Cadence, uMonitor, Edge (Uber API gateway), Uber Geofence, Uber Geoproxy, Populous, Rosetta, Terrablob, Texter/Pusher/PostMaster, Nava, BlackBox tests, Bliss, Flipr, Grafana, Kibana, Hive, HDFS.",
        "Worked on FE MonoRepo projects utilizing GraphQL, React, Fusion (similar to NextJs).",
        "Provided several detailed technical interviews for GoLang BE and React FE candidates."
      ]
    },
    {
      company: "MatchPS / BayRockLabs",
      period: "2021-now",
      title: "AI Solutions Lead",
      highlights: [
        "As the GenAI lead at MatchPoint / BayRockLabs, worked on the architecture of multiple AI automation projects for companies like Lucid. These projects spanned startups and industries such as Ecommerce, Manufacturing, Accounting, Legal, and Hospitality.",
        "Involved in technical interviews for MatchPoint resources for several companies including Uber, Robinhood, Netflix, Airbnb, Peloton, and Gap.",
        "Involved in multiple technology teams at Uber as external Engineer."
      ]
    },
    {
      company: "VisionZLab",
      period: "2010-2023",
      title: "Tech Lead – Part Time",
      highlights: [
        "Worked on several projects in Local and Online Small to Medium Businesses and startups (both B2B and B2C) in various capacities (Full-Stack Developer, Architect, Dev-ops, UI Designer, Product / Project Manager).",
        "Projects included FasterOutcomes (AI Startup in legal industry) - lead architecture and development using React, NextJS, Tailwind CSS, Python, n8n, LangChain, FastAPI, OpenAI LLMs, OCR, AI Agents, Firebase, Google Cloud.",
        "Counta AI (AI Startup in Accounting industry) - stack: Python, LangChain, FastAPI, CrewAI, AI Agents, Minio, Open Source LLMs, OCR.",
        "MirrorMe3D (Mobile Startup in medical industry) - worked on iOS mobile app that scans user's face for 3D modeling using Swift.",
        "Persian Points (Fidely.club) – SAAS Integrated Loyalty program using Node.JS, AngularJS, MongoDB.",
        "Exclusive Listings Club – modern marketplace for Real Estate properties using Firebase, NodeJS, AngularJS, Mandrill, MailChimp, SendGrid, Azure, Google Analytics, HTML5, CSS3, jQuery, Bootstrap, iOS, Android, Ionic.",
        "ELAIN: AI chatbot for real estate using Wit.ai, Motion.ai, Twilio, NodeJS, Algolia Search, Azure ML.",
        "Dojo Jobs (DojoJobs.com): socialized gamified job board for IT contractors using AngularJS, Firebase, HTML5, CSS3, NodeJS, SQL Server 2016, Azure, LinkedIn API.",
        "Migrating local solutions to Azure and AWS Cloud (from infrastructure and network to Websites, Cloud Services, Storages and Document Management Systems).",
        "Developed Hybrid apps for platforms like WebOS, Amazon FireTV, AppleTV, iOS, Android using Electron and Ionic.",
        "Creating Responsive Web Applications using NodeJS, AngularJS, ReactJS, Meteor, ASP.NET MVC, Web API, PHP, WordPress.",
        "Designed mobile applications on Android and iOS - Objective C, Swift, Java."
      ]
    },
    {
      company: "Canada Life",
      period: "2019-2021",
      title: "Solution Architect",
      highlights: [
        "Established and led an in-house mobile development and architecture team, overseeing technical interviews, coaching developers and implementing DevOps automation.",
        "Collaborated with the Front-End team on the NEST project - a comprehensive, automated component library for React and VueJs components using Storybook, Akamai, Jenkins, npm, NodeJS, and Bitbucket.",
        "Devised a system for collecting e-signatures, integrating API architecture with Azure blockchain services to ensure secure and efficient transactions.",
        "Developed an end-to-end solution for AODA-compliant PDF generation, enhancing accessibility standards across digital products.",
        "Cooperated closely with the DevOps teams to optimize automation within Azure and GCP stacks, improving efficiency and reducing potential error.",
        "Engaged in the development and implementation of an enterprise-level authentication solution adhering to security guidelines for OpenID and OAuth 2.0.",
        "Contributed to Salesforce solutions using Angular, Lightning system, and Vlocity tools to enhance CRM efficiency.",
        "Worked on data solutions, managing legacy ETLs and creating new data streams using Kafka for real-time data processing.",
        "Oversaw the architecture, implementation, and automation of an API platform and microservices utilizing Kubernetes, Java Spring Boot, and Apigee.",
        "Designed and implemented a suite of maturity tools to enhance the Kubernetes architecture and DevOps functionality using Istio, Helm, Grafana, Prometheus, ELK, Kafka, Zabbix, Rancher, Spinnaker, Terraform, Vault, and Consul.",
        "Headed the documentation and setup process for developer machines on both Mac and Windows platforms, leveraging tools such as Homebrew, Chocolatey, Docker, MiniKube, Virtualbox, and Hyper-v."
      ]
    },
    {
      company: "The Home Depot",
      period: "2017-2019",
      title: "Software Consultant",
      highlights: [
        "Steered a team of 10+ onshore and 50+ offshore Developers for the homedepot.ca website, using Angular (5-9), NgRx, React.js, Redux, TypeScript, ES6, ES7, Jira, Stash, Git, Artifactory, and Confluence.",
        "Consulted on architecture and actively participated in the migration to Google Cloud, leveraging GCP, Artifactory, Cloud Foundry, Bamboo, Jenkins, Terraform, Consul, Vault, Stash, Packer, and Splunk.",
        "Devised and implemented the roadmap for migration to a microservices architecture using Google Cloud and Kubernetes, utilizing Java Spring, Node, Google Cloud Functions.",
        "Instituted end-to-end Angular Universal Server-Side Rendering to support social sharing and SEO for single-page applications.",
        "Implemented the modularization and containerization of front-end applications using Docker.",
        "Contributed to numerous projects including Order Tracking, Product Information, and Installation Services.",
        "Optimized content pages in AEM and their integration with other architecture components, employing AEM, Adobe DTM, Java 8, and Sling.",
        "Worked on Hybris e-commerce solution projects, extending the Smart Edit using Hybris, Java Spring, JavaNCSS, Sonar, JRebel, Maven, Ant, and Apache.",
        "Contributed to the building of the React Component Library and led the design/initiation of the Angular Component Library from scratch.",
        "Established the onshore mobile app team from scratch, leading technical hiring processes, coaching team members, and architecting native mobile app features for both iOS and Android.",
        "Led the DevOps and CI/CD automation of the mobile app, building the flow from scratch utilizing Jenkins, scripting, and FastLane.",
        "Led the Front-End Mono Repo Proof of Concept (POC) and project implementing Nrwl (Narwhal) on Angular 9.",
        "Designed and implemented a caching layer for recurring APIs leveraging Redis and Apache Kafka for the messaging layer.",
        "Worked on the design and implementation of a custom Analytics solution EVT for monitoring Angular web performance."
      ]
    },
    {
      company: "The Judge Group",
      period: "2017-2019",
      title: "International Instructor",
      highlights: [
        "Conducted hands-on, in-class courses titled 'Migration to Cloud' for various organizations.",
        "Guided organizations through cloud migration stages: decision making, planning, architecture design, networking, continuous delivery and integration, operations, logging and monitoring, high-availability and disaster recovery.",
        "Covered cloud platforms including AWS, Azure, GCP, and Pivotal Cloud Foundry."
      ]
    },
    {
      company: "Maktub",
      period: "2018-2022",
      title: "Principal Architect",
      highlights: [
        "Led the design, development, and implementation of a web application, landing page, and mobile app from scratch.",
        "Utilized Microsoft Azure, Google Cloud, Firebase, Angular 9, Elastic Search, Google Analytics, Amplitude Analytics, React Native, native and hybrid iOS and Android development.",
        "Enhanced efficiency with Mobile DevOps Automation using FastLane.",
        "Implemented server-less architecture, Google Cloud Function as a Service (FaaS), Platform as a Service (PaaS), Docker, Bamboo, Jira, HTML5, CSS3.",
        "Developed a comprehensive Chrome extension to curate content from various popular food, fashion, and experience brands."
      ]
    },
    {
      company: "LAST CALL CC",
      period: "2017-2018",
      title: "Principal Architect",
      highlights: [
        "Architected, developed, and implemented a web application, landing page, and mobile app from the ground up.",
        "Leveraged Microsoft Azure, Google Cloud, Firebase, Angular versions 4-6, Elastic Search, Google Analytics, Amplitude Analytics, and Ionic.",
        "Engaged in native and hybrid iOS and Android development, along with server-less architecture, FaaS, and PaaS.",
        "Used Docker, Bamboo, Jira, HTML5, and CSS3 for effective development and management.",
        "Created a Chrome extension for content curation across popular food, fashion, and experience brands."
      ]
    },
    {
      company: "Xocial, IOU Concepts, Human Code",
      period: "2016-2017",
      title: "Software Consultant",
      highlights: [
        "Developed ReactJS components from scratch, creating a full-stack, responsive application for the FeedABillion Leaderboard using AWS, MongoDB, Meteor, React, Node, Vagrant, Bamboo, and Git.",
        "Enhanced the mobile and web hybrid application by adding video features. Forked and extended open-source Cordova plugin libraries to resolve issues with Meteor. Utilized Blaze for UI creation. Technologies used include Swift, Java, Javascript, Cordova, Android, iOS, and Github.",
        "Developed, optimized, and migrated DevOps workflows and automation using tools such as Bamboo, Circle CI, Jenkins, and Bitbucket.",
        "Created a Chrome extension with AngularJS, Bootstrap, and Typescript to integrate our toolset with third-party websites and tools, including Yammer.",
        "Implemented test automation for Android and iOS mobile applications using AWS Device Farm.",
        "Developed several CRON jobs for extracting data from third-party APIs like Facebook Insight to accumulate data for reporting.",
        "Optimized MongoDB used for both web and mobile applications.",
        "Utilized CRON Jobs, AWS Lambda, microservices architecture, and Data Pipeline to extract and transfer data.",
        "Designed a reporting platform using AWS Redshift, implementing customized reports using Meteor and data tables.",
        "Created and managed AWS services including EC2, Elastic Beanstalk, S3, Redshift, CodePipeline, CloudWatch, CloudFormation, IAM, and Device Farm. Migrated solutions to utilize AWS best practices and tools such as AWS Lambda instead of CRON Jobs."
      ]
    },
    {
      company: "EQAO, Ministry of Education",
      period: "2015-2016",
      title: "Software Consultant",
      highlights: [
        "Worked as a full-stack developer on a customer-facing web application, utilizing ASP.NET MVC best practices and Node automation and package management solutions. The tech stack included ASP.NET MVC, RESTful API, TFS, Gulp, Bower, npm, ASP.NET MVC API, and C#.",
        "Applied Python, Scikit Learn library (SKLearn), and Jupyter Notebook to extract meaningful predictions from historical student assessment data in Ontario.",
        "Redesigned and implemented a new multidimensional data model, migrating all organization data from the old model to a new data warehouse using SQL Server 2012 platform.",
        "Optimized and integrated the new reporting platform with an ASP.NET MVC application using SSIS, SSAS, MDX, and SSRS.",
        "Developed and optimized the front-end Angular application with Bootstrap UI, using AngularJS, Bootstrap, and Typescript."
      ]
    },
    {
      company: "Mosaic Sales Solutions",
      period: "2015",
      title: "Software Consultant",
      highlights: [
        "Contributed to a data gathering web application project, using Rails for backend, and Angular and Bootstrap for frontend. The tech stack included SQL Server, R Studio, Alteryx, Ruby on Rails, Angular, and Git.",
        "Utilized R Studio and Alteryx to perform descriptive, exploratory, inferential, and predictive analyses on existing data.",
        "Leveraged both new and existing BI tools to design and create responsive, interactive, and mobile-ready dashboards for various clients, including Microsoft and Samsung.",
        "Constructed a meta-data warehouse and developed Microstrategy dashboards for monitoring the performance of existing data warehouses and ETL tools.",
        "Developed a framework for using Alteryx as an ETL tool for ad-hoc data mart data mining projects.",
        "Implemented a centralized ETL process to extract and transform data from various sources, including DB2, PostgreSQL, Oracle, MongoDB, and SQL Server databases from various client systems.",
        "Provided insights on supporting and optimizing databases, and implemented an archiving strategy for extra-large data warehouses."
      ]
    },
    {
      company: "TD Bank – Business Intelligence & Data Strategies",
      period: "2014-2015",
      title: "Manager, Software Development",
      highlights: [
        "Developed, automated, and maintained SharePoint and ASP.NET applications to host internal reporting solutions.",
        "Contributed to a comprehensive framework that was adapted for designing and developing Business Intelligence (BI) projects.",
        "Designed and implemented the Banking Services Data Mart for the OMEGA - PEGA project, which involved data modeling with PowerDesigner and the implementation of SSIS, SSRS, SSAS.",
        "Led multiple BI projects for the PEGA Deck, catering to different departments in the Operations and Technology line of business, including Banking and Credit Services.",
        "The technology stack used for these projects included SQL Server, SSIS, SSAS, SSRS, MDX, .NET 4.5, Visual Studio 2013, ASP.NET MVC4, TIBCO, Momentum, and Cognos."
      ]
    },
    {
      company: "TD Bank – Direct Channels",
      period: "2013-2014",
      title: "Sr. Application Architect / Technical Lead",
      highlights: [
        "Worked closely with Development, System Integration Testing (SIT), Business Acceptance Testing (BAT), and Production Acceptance Testing (PAT) teams to develop and test the North American Scorecard Web application and the Business Intelligence (BI) stack.",
        "Oversaw offshore project coordination, ensured product development and quality, and managed system integration.",
        "Led multiple projects using code repository, code deployment, and service desk tools such as JIRA, CA SDM, TFS, and SourceTree.",
        "Conducted training sessions for Coop team members.",
        "Led numerous integration and BI projects in phone and mobile channels, using technologies such as SQL Server, SSIS, SSAS, SSRS, MDX, .NET 4.5, Visual Studio 2013, ASP.NET MVC4, TIBCO, Momentum, and Cognos.",
        "Handled troubleshooting of BI legacy systems, developed and implemented fixes, prepared risk assessment, maintenance plans, and provided recommendations for system upgrades.",
        "Created and managed the technical documentation of ongoing projects, including ABP, Business Case, SRS, SDS, BRD, NFRW, Control Design, data mapping, Change Proposal, and Project Detailed Plan.",
        "Contributed to the Phone Channels Group Strategy by applying a deep understanding of the enterprise architecture within the TD organization through ongoing projects.",
        "Acted as the interface between Enterprise Information Management (EIM) and business applications (e.g., analytics, reporting, BI).",
        "Assumed project management responsibilities for mid-sized integration and BI projects."
      ]
    },
    {
      company: "Learning Tree, Toronto",
      period: "2014-2016",
      title: "International Instructor",
      highlights: [
        "Delivered both online and in-person courses at multiple Learning Tree Education Centers across North America, including locations in Washington, DC, and Toronto, ON.",
        "Taught a comprehensive course on \"Designing an Effective Data Warehouse,\" utilizing SQL Server and Oracle."
      ]
    },
    {
      company: "George Brown College, Toronto",
      period: "2014-2016",
      title: "College Instructor",
      highlights: [
        "Developed a comprehensive new course outline and teaching materials for a class on Web and Business Intelligence using SQL Server 2012.",
        "Focused on learner-centered presentations, integrating field experience and technical knowledge into course material, with an emphasis on interactive, hands-on practice."
      ]
    },
    {
      company: "Cestar College / Lampton College, Toronto",
      period: "2013-2016",
      title: "College Instructor",
      highlights: [
        "Developed curricula ranging from entry-level to advanced topics in a wide range of subjects, meeting tight deadlines consistently.",
        "Topics covered included Ruby on Rails, JavaScript, Java, C#, Objective C, OOP, Android Development, Eclipse, iOS Development, XCode, Visual Studio, Application Architecture, UML, SOA, SDLC, PMLC, Git, Cloud IDEs, Design Patterns and Best Practices.",
        "Tailored curricula and presentation style to meet the needs of diverse audiences, ranging from recent high school graduates to foreign-born individuals with master's degrees.",
        "Integrated field experience and technical knowledge into learner-centered presentations, emphasizing interactive, hands-on practice.",
        "Offered courses including Principles of Software Development, Mobile Development, Web Development, Database Development, Bootstrapping Startups, and Business Intelligence."
      ]
    },
    {
      company: "CAA South Central Ontario",
      period: "2012-2013",
      title: "Solution Architect",
      highlights: [
        "Designed and set up the solution infrastructure, application/Data architecture for several large to medium projects, and created comprehensive documentation and presentations for the Enterprise Architecture.",
        "Led the design, development, implementation, and testing of multiple complex Data Warehouse projects in the Finance, Insurance, and Travel industries.",
        "Led technology research initiatives to adapt new design patterns and technologies for improving the architecture, reliability, and speed of existing and future systems.",
        "Developed parts of the ESB web project collection using the latest technologies and architecture platforms and patterns.",
        "Designed and implemented integration and migration solutions between systems, including SSIS projects, Windows Services, Application Plugins, Change Data Capture, and scheduled SQL jobs.",
        "Designed and implemented a secure portal for storing sensitive organization information in compliance with PCI standards.",
        "Worked on several SQL Server Infrastructure design and upgrade projects, managing software licenses and MSDN subscriptions.",
        "Successfully built complex finance reports such as reconciliation reports for different lines of business and designed the architecture for new SharePoint projects for HR requirements.",
        "Worked on a Cloud POC (Proof of Concept) for migrating existing solutions to Azure and managed, automated, and maintained Code using various tools."
      ]
    },
    {
      company: "Felcom Data Services (Jovian Group)",
      period: "2011-2012",
      title: "Application and Database Developer (Asset and Investment Management)",
      highlights: [
        "Successfully designed, developed, and implemented new and ongoing web project components, including an SLO Reporting system in the IT Portal.",
        "Worked in a challenging, fast-paced financial environment, handling several servers, live websites, and users across Canada and the US.",
        "Designed, developed, and implemented queries, stored procedures, SSIS packages, and maintenance plans for deploying, integrating, and maintaining databases.",
        "Refactored and implemented Object-Oriented Programming (OOP) and Design Patterns on new and existing projects.",
        "Held internal teaching sessions for new technologies and domain knowledge for new team members.",
        "Created and utilized comprehensive architectural documents for existing and ongoing projects, including Business Process Models, Use Case to Class and Data Models.",
        "Completed comprehensive maintenance and training documentation for various web projects.",
        "Developed and implemented unit tests and regression tests, and debugged web applications in both server-side and client-side code."
      ]
    },
    {
      company: "Royal Persicus Inc.",
      period: "2008-2011",
      title: "Senior Programmer, (Financial Project Management)",
      highlights: [
        "Designed, developed, and implemented several components for various Enterprise Solutions within the Financial Industry, including project cost tracking and progress monitoring tools used by major banks, pension funds, and insurance companies.",
        "Designed and implemented sales and finance reports and Mart layer of the Business Intelligence project using Crystal Reports and SSRS Reports.",
        "Completed comprehensive analysis and requirements document for business applications and project proposals, including time and cost/resource estimation and progress reports.",
        "Interacted closely with both the architecture team and the business to develop ideas and specifications. Also collaborated with QA and operations teams to ensure on time and error-free delivery of the solutions.",
        "Led the technology research team for adopting new technologies and upgrading old ones."
      ]
    },
    {
      company: "Javid Educational Center",
      period: "2006-2007",
      title: "Senior Developer",
      highlights: [
        "Participated in proposing, analyzing, designing (software architecture and database structure), and implementing several different projects including Student Information Management System, Online Admission Application, Document Management System, Student Assessment Process.",
        "Interacted directly with customers to extract Business Requirements Documents (BRDs) and ensured consistency with the customer requirements throughout the development process.",
        "Designed and implemented the process of rolling out older systems, including planning for new servers, introducing new procedures, and providing staff training.",
        "Created complex ETL (Extract, Transform, Load) processes to migrate data from legacy systems to the new system.",
        "Compiled a set of development regulations and templates for various tasks, including stored procedures, code review processes, logging practices, and security methods."
      ]
    },
    {
      company: "Faragam Inc.",
      period: "2002-2006",
      title: "DEVELOPER",
      highlights: [
        "Designed, developed, tested, and implemented an Enterprise Cost Estimation and Progress Monitoring Software Solution for large-scale construction projects.",
        "The solution connected to several database engines and pricing reference libraries and technical codes, providing services to up to 100 concurrent users in a multi-tier architecture.",
        "Designed and developed several reports using Crystal Reports, providing summary and detailed cost estimations, cost progress reports, and invoices.",
        "Completed comprehensive requirements documents for business applications and project proposals, including time and cost/resource estimation and progress reports.",
        "Implemented and updated unit price detail packages using SQL Server 2005."
      ]
    }
  ],
  keywords: [
    "Frank Goortani", "Goortani", "MLOPS", "Solution Consultant", "Solution Architect",
    "Software Developer", "Full-stack", "AWS", "Azure", "GCP", "Mobile Development",
    "Web Development", "DevOps", "JavaScript", "Python", "Angular", "React", "Golang",
    "Typescript", "Agile", "Data Engineering", "LLMs", "AI Agents", "Generative AI",
    "Linux", "Mac", "Windows", "XCode", "Android Studio", "IntelliJ", "Gladle", "JIRA",
    "Virtualbox", "Bamboo", "Jenkins", "Circle CI", "GIT", "SourceTree", "n8n", "Cadence",
    "Azure", "AWS", "DevOps", "Temporal", "CA Erwin", "PowerDesigner", "Jupiter", "iPython",
    "OpenRefine", "Tesseract OCR", "markdown", "LangChain", "LLMs", "Ollama",
    "Langgraph", "CrewAI", "Agentic", "AI Crawlers", "pydantic", "Uvicorn", "StreamLit",
    "Google Gemini", "OpenAI LLMs", "Meta LLMs", "Firestore", "Firebase functions",
    "Nginx", "GCP Cloud Run", "GCP IAM", "Spring", "Hibernate", "Swagger", "JBOSS", "JSP",
    "Helm", "Jetty", "Istio Selenium", "Cucumber", "Grafana", "Spring Boot", "Chef", "Puppet",
    "Salt", "AWS EC2", "VPC", "S3", "Cognito", "Lambda", "SNS", "Cloud Front", "Cloud Formation",
    "Cloud Watch", "IAAS", "PAAS", "SAAS", "AI APIs", "Graylog", "Datadog", "StackDriver",
    "Splunk", "Prometheus", "Spinnaker", "Ant", "JRebel", "Zabbix", "Rancher", "Angular", "React",
    "Next", "Svelt", "RxJava", "RxSwift", "RxJS", "VueJs", "GraphQL", "gRPC", "Rest", "RAG",
    "Node.JS", "Docker", "React Native", "Material Design", "WebSockets", "OnsenUI", "shadcn",
    "Tailwind", "SciKit Learn", "Azure ML Studio", "Heroku", "Bitbucket", "GitHub",
    "Express", "Maven", "Ionic", "Redux", "Firebase test lab", "Jest", "Mocha", "Puppeteer",
    "Karma", "Istanbul", "AWS device farm", "API Gateway", "Webpack", "PlantUML", "K8S",
    "Jasmine", "Karma", "Protractor", "TOGAF", "PMBOK", "BABOK", "ITIL", "Open ID", "OAuth 2.0",
    "Azure VM", "Glassfish", "npm", "yarn", "Dino", "Sonar", "Mockito", "Spring Test",
    "Fortify Scan", "Cloud Foundry", "Azure DevOps", "Google Kubernetes", "AWS Pipeline",
    "AWS Steps Function", "SNS", "SQS", "Chatbots", "Browser Extensions",
    "Helm", "ELK", "Zookeeper", "Docker", "Rest-Assured", "WebDriver", "Locust", "Kong",
    "Dynatrace", "Prompt Engineering", "Containers", "Apigee", "Collibra", "Artifactory",
    "C#", "Ruby", "Python", "GoLang", "JavaScript", "ES6", "Java", "Spring", "HTML5", "CSS3",
    "XML", "YAML", "JSON", "Tableau", "Akamai", "Vector DBs", "Swift", "Objective-C", "Cohere",
    "SQL Server", "Azure CDN", "LangFuse", "SQL Azure", "Oracle", "CouchDB", "MongoDB",
    "Azure CosmosDB", "CouchBase", "ElasticSearch", "MySQL", "Postgresql", "Solr",
    "HBase", "Spark", "MySQL", "Kafka", "Hadoop", "Spark", "PIG", "HIVE", "Firebase",
    "Redshift", "PineCone", "Embedding Models", "Agent flow", "Aider", "CoPilot", "Agentic coding",
    "Chroma", "Weaviate", "SQL Server BI", "BIDS", "SSDT", "DynamoDB", "Hugging Face models",
    "AWS RDS", "Azure Search", "AWS and Azure Storage", "OBIEE", "Alteryx", "Azure ML",
    "Azure Data Lake", "Data Factory", "Azure DW", "Azure Functions", "Logic App", "Data Streams",
    "Hashicorp Vault", "Packager", "Hashicorp Consul", "Terraform"
  ]
};

/**
 * Register all tools with the MCP server
 *
 * @param server The FastMCP server instance
 */
export function registerTools(server: FastMCP) {
  // CV Tools
  server.addTool({
    name: "get_profile",
    description: "Get Frank Goortani's profile information",
    parameters: z.object({}),
    execute: async () => {
      return JSON.stringify(cvData.profile);
    }
  });

  server.addTool({
    name: "get_skills",
    description: "Get Frank Goortani's skills",
    parameters: z.object({}),
    execute: async () => {
      return JSON.stringify(cvData.skills);
    }
  });

  server.addTool({
    name: "get_interests",
    description: "Get Frank Goortani's interests",
    parameters: z.object({}),
    execute: async () => {
      return JSON.stringify(cvData.interests);
    }
  });

  server.addTool({
    name: "get_education",
    description: "Get Frank Goortani's education history",
    parameters: z.object({}),
    execute: async () => {
      return JSON.stringify(cvData.education);
    }
  });

  server.addTool({
    name: "get_links",
    description: "Get Frank Goortani's professional links",
    parameters: z.object({}),
    execute: async () => {
      return JSON.stringify(cvData.links);
    }
  });

  server.addTool({
    name: "get_startups",
    description: "Get Frank Goortani's startup experience",
    parameters: z.object({}),
    execute: async () => {
      return JSON.stringify(cvData.startups);
    }
  });

  server.addTool({
    name: "search_cv",
    description: "Search Frank Goortani's CV for specific terms",
    parameters: z.object({
      query: z.string().describe("The search term to look for in the CV")
    }),
    execute: async (
      params,
      { log, reportProgress, streamContent }: { log: any; reportProgress: any; streamContent?: (content: any) => Promise<void> }
    ) => {
      const query = params.query.toLowerCase();
      const results = {
        matches: [] as Array<{section: string, content: string}>
      };

      log.info("Starting CV search", { query });

      const totalSections = 8;
      let processedSections = 0;

      // Search in profile
      if (cvData.profile.description.toLowerCase().includes(query)) {
        const match = {
          section: "profile",
          content: cvData.profile.description
        };
        results.matches.push(match);
        if (streamContent) {
          await streamContent({ text: JSON.stringify(match), type: "text" });
        }
      }
      processedSections++;
      await reportProgress({ progress: processedSections, total: totalSections });

      // Search in education
      const matchingEducation = cvData.education.filter(edu =>
        edu.institution.toLowerCase().includes(query) ||
        edu.degree.toLowerCase().includes(query)
      );
      if (matchingEducation.length > 0) {
        const match = {
          section: "education",
          content: matchingEducation.map(edu =>
            `${edu.degree} from ${edu.institution} (${edu.year})`
          ).join("\n")
        };
        results.matches.push(match);
        if (streamContent) {
          await streamContent({ text: JSON.stringify(match), type: "text" });
        }
      }
      processedSections++;
      await reportProgress({ progress: processedSections, total: totalSections });

      // Search in links
      const matchingLinks = cvData.links.filter(link =>
        link.name.toLowerCase().includes(query) ||
        link.url.toLowerCase().includes(query)
      );
      if (matchingLinks.length > 0) {
        const match = {
          section: "links",
          content: matchingLinks.map(link =>
            `${link.name}: ${link.url}`
          ).join("\n")
        };
        results.matches.push(match);
        if (streamContent) {
          await streamContent({ text: JSON.stringify(match), type: "text" });
        }
      }
      processedSections++;
      await reportProgress({ progress: processedSections, total: totalSections });

      // Search in startups
      const matchingStartups = cvData.startups.filter(startup =>
        startup.name.toLowerCase().includes(query) ||
        startup.year.toLowerCase().includes(query)
      );
      if (matchingStartups.length > 0) {
        const match = {
          section: "startups",
          content: matchingStartups.map(startup =>
            `${startup.name} (${startup.year})`
          ).join("\n")
        };
        results.matches.push(match);
        if (streamContent) {
          await streamContent({ text: JSON.stringify(match), type: "text" });
        }
      }
      processedSections++;
      await reportProgress({ progress: processedSections, total: totalSections });

      // Search in skills
      const matchingSkills = cvData.skills.filter(skill =>
        skill.toLowerCase().includes(query)
      );
      if (matchingSkills.length > 0) {
        const match = {
          section: "skills",
          content: matchingSkills.join(", ")
        };
        results.matches.push(match);
        if (streamContent) {
          await streamContent({ text: JSON.stringify(match), type: "text" });
        }
      }
      processedSections++;
      await reportProgress({ progress: processedSections, total: totalSections });

      // Search in interests
      const matchingInterests = cvData.interests.filter(interest =>
        interest.toLowerCase().includes(query)
      );
      if (matchingInterests.length > 0) {
        const match = {
          section: "interests",
          content: matchingInterests.join(", ")
        };
        results.matches.push(match);
        if (streamContent) {
          await streamContent({ text: JSON.stringify(match), type: "text" });
        }
      }
      processedSections++;
      await reportProgress({ progress: processedSections, total: totalSections });

      // Search in experience
      cvData.experience.forEach(async (exp) => {
        const matchingHighlights = exp.highlights.filter(highlight =>
          highlight.toLowerCase().includes(query)
        );

        if (
          exp.company.toLowerCase().includes(query) ||
          exp.title.toLowerCase().includes(query) ||
          exp.period.toLowerCase().includes(query) ||
          matchingHighlights.length > 0
        ) {
          const match = {
            section: `experience at ${exp.company} (${exp.period})`,
            content:
              matchingHighlights.length > 0
                ? matchingHighlights.join("\n")
                : `${exp.title} at ${exp.company}, ${exp.period}`
          };
          results.matches.push(match);
          if (streamContent) {
            await streamContent({ text: JSON.stringify(match), type: "text" });
          }
        }
      });
      processedSections++;
      await reportProgress({ progress: processedSections, total: totalSections });

      // Search in keywords
      const matchingKeywords = cvData.keywords.filter(keyword =>
        keyword.toLowerCase().includes(query)
      );
      if (matchingKeywords.length > 0) {
        const match = {
          section: "keywords",
          content: matchingKeywords.join(", ")
        };
        results.matches.push(match);
        if (streamContent) {
          await streamContent({ text: JSON.stringify(match), type: "text" });
        }
      }
      processedSections++;
      await reportProgress({ progress: processedSections, total: totalSections });

      log.info("Finished CV search", { matches: results.matches.length });

      return JSON.stringify(results);
    }
  });

  server.addTool({
    name: "get_company_experience",
    description: "Get Frank Goortani's experience at a specific company",
    parameters: z.object({
      company: z.string().describe("Company name to get experience for")
    }),
    execute: async (params) => {
      const companyName = params.company.toLowerCase();
      const companyExperiences = cvData.experience.filter(exp =>
        exp.company.toLowerCase().includes(companyName)
      );

      const result = companyExperiences.length === 0
        ? { found: false, message: `No experience found for company: ${params.company}` }
        : { found: true, experiences: companyExperiences };

      return JSON.stringify(result);
    }
  });

  server.addTool({
    name: "get_resume_link",
    description: "Get the link to Frank Goortani's resume PDF",
    parameters: z.object({}),
    execute: async () => {
      return JSON.stringify({ resumeLink: cvData.resume.url });
    }
  });

  server.addTool({
    name: "get_profile_picture",
    description: "Get the link to Frank Goortani's profile picture",
    parameters: z.object({}),
    execute: async () => {
      return JSON.stringify({ pictureLink: cvData.picture.url });
    }
  });

  server.addTool({
    name: "get_tech_stack",
    description: "Get Frank Goortani's technology stack based on keywords",
    parameters: z.object({
      category: z.string().optional().describe("Optional category to filter technologies (e.g., 'cloud', 'languages', 'frameworks')")
    }),
    execute: async (params) => {
      const category = params.category?.toLowerCase();

      // Create category mappings
      const categoryMappings: Record<string, string[]> = {
        'languages': ['Go', 'Python', 'Java', 'Swift', 'Typescript', 'JavaScript', 'C#', 'Ruby', 'HTML5', 'CSS3', 'SQL', 'XML', 'YAML', 'JSON', 'Objective-C'],
        'cloud': ['AWS', 'Azure', 'GCP', 'Google Cloud', 'Cloud Foundry', 'Serverless', 'IAAS', 'PAAS', 'SAAS'],
        'frameworks': ['Angular', 'React', 'Next', 'Spring', 'LangChain', 'Express', 'Svelt', 'VueJs', 'RxJS', 'Redux', 'Firebase', 'Material Design', 'Tailwind', 'Bootstrap'],
        'ai': ['LLMs', 'OpenAI', 'Generative AI', 'AI Agents', 'AI automation', 'Machine Learning', 'CrewAI', 'Agentic', 'AI Crawlers', 'Google Gemini', 'Hugging Face', 'Embedding Models'],
        'databases': ['SQL Server', 'MySQL', 'MongoDB', 'CosmosDB', 'CouchDB', 'CouchBase', 'ElasticSearch', 'PostgreSQL', 'Solr', 'Oracle', 'DynamoDB', 'Firebase', 'Vector DBs', 'Pinecone', 'Chroma', 'Weaviate', 'Redshift']
      };

      // Get all technologies from keywords
      const technologies = [...cvData.keywords];

      let result: Record<string, any> = {};

      if (category && categoryMappings[category]) {
        // Filter by requested category
        const filteredTech = technologies.filter(tech => {
          return categoryMappings[category].some(catTech =>
            tech.toLowerCase().includes(catTech.toLowerCase())
          );
        });
        result = { category, technologies: filteredTech };
      } else {
        // Return all technologies organized by category
        result.categories = {};
        Object.keys(categoryMappings).forEach(cat => {
          result.categories[cat] = technologies.filter(tech => {
            return categoryMappings[cat].some(catTech =>
              tech.toLowerCase().includes(catTech.toLowerCase())
            );
          });
        });

        // Include all keywords as a flat list
        result.all = technologies;
      }

      return JSON.stringify(result);
    }
  });
}
