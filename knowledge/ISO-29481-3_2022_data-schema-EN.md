# ISO 29481-3:2022 (EN ISO 29481-3:2022; UNE-EN ISO 29481-3:2022) — Building information models — Information delivery manual — Part 3: Data schema

Normative reference text (summary of the requirements in English, kept in the original terms). Cite the exact clause (for example "ISO 29481-3, 6" or "10.3").

## Scope
- Technical addition to ISO 29481-1. Defines a specification to store, exchange and read information delivery manual (IDM) specifications in a standardized, machine-readable way.
- Defines the idmXML schema definition (idmXSD), an XML data schema for authoring, exchanging and sharing an IDM specification defined by ISO 29481-1.

## Normative references
ISO 639-1 (language codes); ISO 3166-1 (country codes); ISO 8601-1 (date and time); ISO 22263 (framework for management of project information); ISO 29481-1:2016.

## 3 Terms and definitions
- attribute: XML construct that modifies or provides descriptive metadata about an element's content.
- information delivery manual code (IDM code): code for an IDM specification created from its key identifying features.
- information delivery manual specification (IDM specification): instance of an IDM and its components.
- use case (UC): description of an information use for a specific purpose by one or more actors and/or systems.
- business context map: description of the information flow in a business context, represented as a process map or interaction map.

## 4 Overview of the IDM schema
**4.1 Naming convention.** CamelCase for schema elements. Abbreviations allowed: idm (information delivery manual), uc (use case), er (exchange requirement), pm (process map), im (interaction map), tm (transaction map), id (identifier). Elements that represent descriptions, groups or sets use the plural.
**4.2 Restriction notation.** PK = primary key; required = mandatory; optional = not mandatory; 1:1 = exactly one; 0:1 = zero or one; 0:* = zero to many.
**4.3 Overall structure.** The idmXSD consists of the idm element and three core components: UC, business context map and ER, plus their relations and properties. An IDM specification consists of a UC, business context maps and an ER. A UC includes the header information of ISO 29481-1 and metadata sufficient for the context and scope. A business context map represents the information delivery processes (PM and/or IM). An ER defines the information required by a UC at information-unit level, possibly referencing standard data schemas (CityGML, ISO 16739-1 IFC, gbXML, ISO 12006-3).

## 5 Information delivery manual (idm element)
- The idm element is the single root element of the idmXSD and wraps the core components.
- Each idm is associated with exactly one uc and exactly one er (er may be unspecified in early development).
- An idm may contain zero to many businessContextMap elements and zero to many subIdm elements.
- Elements: specId (1:1), authoring (1:1), subIdm (0:*), uc (1:1), businessContextMap (0:*), er (0:1).

## 6 Specification identifier (specId)
Every IDM component has four identifiers: guid (globally unique identifier, PK), idmCode (human- and machine-readable code), fullTitle and shortTitle (the short title must be in English). Other attributes: localShortTitle, subTitle, localCode, documentStatus (NP, WD, PUB or WDRL), localDocumentStatus and version.

## 7 Authoring
- authoring stores the author information and the change history: copyright (required), changeLog (1:*), author (0:*), committee (0:*), publisher (0:1).
- changeLog: id (PK), changeDateTime (required, format YYYY-MM-DD per ISO 8601-1), changeSummary (required), changedBy (1:1, reference to an author id), change (0:*, with changedElement and changedFrom).
- author: id (PK); person (1:*: firstName required; middleName, lastName, emailAddress, affiliation optional); organization (1:*: name, required and unique).
- committee: name (PK); leader (0:*) and member (0:*) as references to author ids.
- publisher: name (required) and location (optional).

## 8 Use case (uc element)
Elements (cardinality): specId 1:1; authoring 1:1; subUc 0:*; summary 1:1 (one or more descriptions); aimAndScope 1:1; language 1:1 (ISO 639-1); use 1:* (name required and unique in verb + noun form; optional classification); standardProjectPhase 1:* (name: enumeration inception, brief, design, production, maintenance, demolition, per ISO 22263; optional outcomes and informationRequirements); localProjectPhase 0:* (name 1:1; optional outcomes, informationRequirements, classification); region 1:* (type: continent, country or user-defined, default "USR"; value: ISO 3166-1 codes, default "INT" for international); constructionEntity 0:* (name, optional classification); businessRule 0:* (id PK, name required and unique, proposition 1:1, reference 0:*); actor 0:* (id required, name required and unique, optional classification); benefits 0:1; limitations 0:1; requiredResources 0:1; requiredCompetencies 0:1; scopeKeyword 0:*; benefitKeyword 0:*; reference 0:* (basisStandard boolean required; fullCitation required and unique); userDefinedProperty 0:* (name required and unique; description 1:*).
- classification: id (PK), name (required), version (optional), publicationYear (optional, gYear YYYY).
- outcomes and informationRequirements: textual or visual descriptions; informationRequirements may link to ERs (associatedEr) and to exchange information requirements documents per ISO 19650-2.
- description: title (optional) and image (0:*). image: caption and filePath (required).

## 9 Business context map
- Elements: specId 1:1; authoring 1:1; subBusinessContextMap 0:*; pm 0:* (diagram 1:1, subPm 0:*, dataObjectAndEr 0:*); im 0:* (diagram 1:1, tm 1:*).
- ISO 29481-1 gives two methods: process map (PM, recommended notation BPMN, ISO/IEC 19510) and interaction map/transaction map (IM/TM, recommended notation ISO 29481-2).
- diagram: id (PK), name (required), diagramFilePath (required), imageFilePath (optional), notation (required), description (0:1).
- dataObjectAndEr: id (PK), associatedDataObject (1:1), associatedEr (1:1) — links a data object of a PM diagram to an ER.
- messageAndEr: id (PK), associatedMessage (1:1), associatedEr (1:1) — links a message of a TM diagram to an ER.

## 10 Exchange requirement (er element)
- An ER is composed of information units and/or sub-ERs. It must have at least one information unit or sub-ER. Elements: specId 1:1; authoring 1:1; subEr 0:*; informationUnit 1:* ; constraint 0:*; correspondingMvd 0:*; description 0:*.
- **10.2 informationUnit**: id (PK), name (required), dataType (required), isMandatory (boolean, required), definition (required); optional examples (0:1, with description 1:*), correspondingExternalElement (0:*: basis and name required, optional description), subInformationUnit (0:*, recursive).
- **10.3 constraint**: id (PK), associatedInformationUnit (optional), associatedBusinessRule (optional), description (0:*). Constraints express restrictions such as text length or maximum and minimum data size.
- **10.4 correspondingMvd**: basis and name (required), description (0:*). MVDs are specified separately and are not part of the IDM specification; an MVD can be linked optionally (for example buildingSMART Coordination View).

## 11 IDM code generation rules
An IDM code combines a classification code and a document-oriented information code, for example: er_AuthorEstimate_BR_DE_NOR_EN_CostEstimationForBridge_bSI_20200317_WD.
- Classification part: specification type (UC, PM, ER, IM; ISO 29481-1); primary use as verb + noun (ISO 29481-1); project phases start and end (ISO 22263: IN, BR, DE, PR, MA, DE); primary region (ISO 3166-1 alpha-3); language (ISO 639-1).
- Document part: short title in English without white space; author or committee (last name of the leading author or short committee name); initial date (YYYY-MM-DD, ISO 8601-1); document status (NP, WD, PUB, WDRL).

## Annex B (informative) — IDM specification stages
NP (new proposal) corresponds to ISO harmonized stages 00–20 (preliminary, proposal, preparatory). WD (working draft) corresponds to stages 30–50 (committee, enquiry, approval). PUB (publication) corresponds to stages 60–90 (publication, review). WDRL (withdrawal) corresponds to stage 95 (withdrawal).
