#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KINEDRIK Advisor AI - Normativa RAG KB Builder (multi-área)
Generalización de chunk_norms.py (usado para BIM) a cualquier área: misma
lógica de chunking por apartado/cláusula numerada + Anexos, mismo esquema de
salida, mismas reglas de no-invención. Cada área se procesa por separado
(AREAS dict) y también se puede fusionar en un índice único para el
"kai advisor" de programación.

Regla de oro: nunca inventar texto. Todo extracto es literal del PDF fuente
descargado de Drive. Donde no se puede verificar, se marca REQUIERE VALIDACIÓN.
"""
import re, json, hashlib, datetime, os

OUT_DIR = "/tmp/kinedrik/kb_out"
os.makedirs(OUT_DIR, exist_ok=True)

HEAD_RE = re.compile(r'^(?P<num>\d{1,2}(?:\.\d{1,2}){0,3})\s+(?P<title>[A-ZÁÉÍÓÚÑ0-9][^\n]{2,140})$', re.MULTILINE)
ANEXO_RE = re.compile(r'^(?P<num>Anexo [A-Z])\s*(?:\(\w+\))?\s*\n?(?P<title>[A-ZÁÉÍÓÚÑ][^\n]{2,140})$', re.MULTILINE)
STOPWORDS_TITLE = ("Prohibida", "Génova", "AENOR", "Este documento")
SCRAMBLE_RE = re.compile(r'\d,\d')

# ==========================================================================
# Definición de áreas. Cada NORMS entry: file (ruta abs), codigo (con
# vigencia real del texto), titulo, familia, parte, idioma, vigente.
# Fuente Drive documentada en 'origen_folder' para trazabilidad.
# ==========================================================================
AREAS = {
    "ATRDIGI": {
        "area_nombre": "Transformación Digital",
        "origen_folder": "Google Drive / KINEDRIK Normativa / Transformacion digital (parentId 1ggDkcnA415LFvpMosKQjWCuimKAfuMYC)",
        "src_dir": "/tmp/kinedrik/areas/ATRDIGI_raw",
        "norms": [
            {"file": "27001_2023.txt", "codigo": "UNE-EN ISO/IEC 27001:2023", "titulo": "Seguridad de la información, ciberseguridad y protección de la privacidad. Sistemas de gestión de la seguridad de la información. Requisitos",
             "familia": "ISO/IEC 27001", "parte": None, "idioma": "es", "vigente": True},
            {"file": "27002_2023.txt", "codigo": "UNE-EN ISO/IEC 27002:2023", "titulo": "Seguridad de la información, ciberseguridad y protección de la privacidad. Controles de seguridad de la información",
             "familia": "ISO/IEC 27002", "parte": None, "idioma": "es", "vigente": True},
            {"file": "27005_2024.txt", "codigo": "UNE-EN ISO/IEC 27005:2024", "titulo": "Seguridad de la información, ciberseguridad y protección de la privacidad. Orientación sobre la gestión de riesgos de seguridad de la información",
             "familia": "ISO/IEC 27005", "parte": None, "idioma": "es", "vigente": True},
            {"file": "27007_2022.txt", "codigo": "UNE-EN ISO/IEC 27007:2022", "titulo": "Seguridad de la información, ciberseguridad y protección de la privacidad. Directrices para la auditoría de sistemas de gestión de seguridad de la información",
             "familia": "ISO/IEC 27007", "parte": None, "idioma": "es", "vigente": True},
            {"file": "27017_2021.txt", "codigo": "UNE-EN ISO/IEC 27017:2021", "titulo": "Tecnología de la información. Técnicas de seguridad. Código de prácticas para los controles de seguridad de la información basados en ISO/IEC 27002 para los servicios en la nube",
             "familia": "ISO/IEC 27017", "parte": None, "idioma": "es", "vigente": True},
            {"file": "31000_2018.txt", "codigo": "UNE-ISO 31000:2018", "titulo": "Gestión del riesgo. Directrices",
             "familia": "ISO 31000", "parte": None, "idioma": "es", "vigente": True},
            {"file": "56002_2021.txt", "codigo": "UNE-EN ISO 56002:2021", "titulo": "Gestión de la innovación. Sistema de gestión de la innovación. Directrices",
             "familia": "ISO 56002", "parte": None, "idioma": "es", "vigente": True},
        ],
        # Modificaciones/amendments cortos que no tienen estructura de apartados
        # propia (solo tocan 1-2 cláusulas de la norma base): se registran como
        # chunks manuales ligados al chunk_id de la cláusula que modifican, NUNCA
        # fusionados silenciosamente dentro del extracto original.
        "amendments": [
            {"file": "27001_A1_2024.txt", "norma_codigo": "UNE-EN ISO/IEC 27001:2023/A1:2024",
             "norma_titulo": "Modificación 1 a ISO/IEC 27001:2023: acciones relativas al cambio climático",
             "familia": "ISO/IEC 27001", "clausulas_afectadas": ["4.1", "4.2"], "vigente": True},
            {"file": "22301_A1_2024.txt", "norma_codigo": "UNE-EN ISO 22301:2020/A1:2024",
             "norma_titulo": "Modificación 1 a ISO 22301:2020: acciones relativas al cambio climático (norma base 22301 NO incluida en este corpus)",
             "familia": "ISO 22301", "clausulas_afectadas": ["4.1", "4.2.1"], "vigente": True},
        ],
    },
    "AGESDIR": {
        "area_nombre": "Gestión y Financiación de Empresas y Proyectos",
        "origen_folder": "Google Drive / KINEDRIK Normativa / Proyectos (parentId 1qMdhSLpZkHv7VkbYCvVvkZFaHuVwcBqT)",
        "src_dir": "/tmp/kinedrik/areas/AGESDIR_raw",
        "norms": [
            {"file": "21500_2022.txt", "codigo": "UNE-ISO 21500:2022", "titulo": "Gestión de proyectos, programas y carteras de proyectos. Contexto y conceptos",
             "familia": "ISO 21500", "parte": None, "idioma": "es", "vigente": True},
            {"file": "21502_2022.txt", "codigo": "UNE-ISO 21502:2022", "titulo": "Gestión de proyectos, programas y carteras de proyectos. Orientación sobre la gestión de proyectos",
             "familia": "ISO 21502", "parte": None, "idioma": "es", "vigente": True},
            {"file": "10006_2018.txt", "codigo": "UNE-ISO 10006:2018", "titulo": "Sistemas de gestión de la calidad. Directrices para la gestión de la calidad en proyectos",
             "familia": "ISO 10006", "parte": None, "idioma": "es", "vigente": True},
            {"file": "9001_2015.txt", "codigo": "UNE-EN ISO 9001:2015", "titulo": "Sistemas de gestión de la calidad. Requisitos",
             "familia": "ISO 9001", "parte": None, "idioma": "es", "vigente": True},
        ],
        "amendments": [
            {"file": "9001_A1_2024.txt", "norma_codigo": "UNE-EN ISO 9001:2015/A1:2024",
             "norma_titulo": "Modificación 1 a ISO 9001:2015: acciones relativas al cambio climático",
             "familia": "ISO 9001", "clausulas_afectadas": ["4.1", "4.2"], "vigente": True},
        ],
        # NOTA: el PMBOK 7ª ed. traducido (996503163-Pmbok-2025-8-Traducido-a-ESP.pdf,
        # 23MB) vive en esta misma carpeta Drive pero NO se procesa aquí: es un libro,
        # no una norma con apartados numerados como los de arriba, y su tamaño (23MB)
        # requiere un chunking propio (por dominio de desempeño / principio, no por
        # cláusula ISO) para no trocearlo de forma artificial. Queda como tarea aparte,
        # ya señalada por Andrea como "ya cargado" — pendiente de decidir si se
        # chunkea igual que las normas ISO o con una lógica distinta (capítulos).
    },
    "AINFRAT": {
        "area_nombre": "Infraestructura Civil y de Transporte",
        "origen_folder": "Google Drive / KINEDRIK Normativa / Carreterras y seguridad vial (parentId 1pS_11hZDW2yWL92Dmjh4Lb6qdRLJzZpH)",
        "src_dir": "/tmp/kinedrik/areas/AINFRAT_raw",
        "norms": [
            {"file": "UNE_159000-1_2009.txt", "codigo": "UNE 159000-1:2009", "titulo": "Telemática aplicada a la circulación y transporte por carretera. Sistemas telemáticos aplicables a la explotación de carreteras en régimen de peaje en sombra. Parte 1: Marco general",
             "familia": "UNE 159000", "parte": "1", "idioma": "es", "vigente": True},
            {"file": "UNE_159000-2_2009.txt", "codigo": "UNE 159000-2:2009", "titulo": "Telemática aplicada a la circulación y transporte por carretera. Sistemas telemáticos aplicables a la explotación de carreteras en régimen de peaje en sombra. Parte 2: Sistemas de control de tráfico",
             "familia": "UNE 159000", "parte": "2", "idioma": "es", "vigente": True},
            {"file": "UNE_159000-3_2009.txt", "codigo": "UNE 159000-3:2009", "titulo": "Telemática aplicada a la circulación y transporte por carretera. Sistemas telemáticos aplicables a la explotación de carreteras en régimen de peaje en sombra. Parte 3: Sistemas y procedimientos de contraste por muestreo",
             "familia": "UNE 159000", "parte": "3", "idioma": "es", "vigente": True},
            {"file": "UNE-EN_1793-4_2015.txt", "codigo": "UNE-EN 1793-4:2015", "titulo": "Dispositivos reductores de ruido de tráfico en carreteras. Método de ensayo para determinar el comportamiento acústico. Parte 4: Características intrínsecas. Valores in situ de la difracción sonora",
             "familia": "UNE-EN 1793", "parte": "4", "idioma": "es", "vigente": True},
            {"file": "UNE-EN_1794-1_2025.txt", "codigo": "UNE-EN 1794-1:2025", "titulo": "Dispositivos reductores de ruido de tráfico en carreteras. Comportamiento no acústico. Parte 1: Métodos para la determinación de las características mecánicas y de estabilidad",
             "familia": "UNE-EN 1794", "parte": "1", "idioma": "es", "vigente": True},
            {"file": "UNE-EN_13422_2020.txt", "codigo": "UNE-EN 13422:2020 (versión corregida noviembre 2024)", "titulo": "Señalización vertical de carreteras. Dispositivos de advertencia portátiles deformables y delineadores. Señalización de tráfico portátil para carreteras. Conos y cilindros",
             "familia": "UNE-EN 13422", "parte": None, "idioma": "es", "vigente": True},
            {"file": "UNE_41201_2020_IN.txt", "codigo": "UNE 41201 IN:2020", "titulo": "Características superficiales de carreteras y aeropuertos. Procedimiento de medición del coeficiente de rozamiento transversal (CRT) con equipo SCRIM",
             "familia": "UNE 41201", "parte": None, "idioma": "es", "vigente": True},
            {"file": "UNE-CEN_TS_15901-7_2010_IN.txt", "codigo": "UNE-CEN/TS 15901-7 IN:2010", "titulo": "Características superficiales de carreteras y aeropuertos. Parte 7: Procedimiento para determinar la resistencia al deslizamiento de la superficie de un pavimento utilizando un equipo con el ratio de deslizamiento longitudinal fijo (CRLG): GripTester",
             "familia": "UNE-CEN/TS 15901", "parte": "7", "idioma": "es", "vigente": True},
            {"file": "UNE-EN_15430-1_2024.txt", "codigo": "UNE-EN 15430-1:2024", "titulo": "Equipos de vialidad invernal y mantenimiento de áreas de servicio en carreteras. Adquisición y transmisión de datos. Parte 1: Adquisición de datos en vehículos",
             "familia": "UNE-EN 15430", "parte": "1", "idioma": "en (ratificada en español por AENOR, enero 2025)", "vigente": True},
            {"file": "CEN_ISO_TS_18234-4_2006.txt", "codigo": "CEN ISO/TS 18234-4:2006", "titulo": "Sistemas inteligentes de transporte. Protocolo de Grupo de Expertos en Información de Tráfico y Viajero (TPEG) mediante Transport Protocol Experts Group, Especificación de datos genéricos TPEG. Parte 4: Mensajes de Información de Tráfico y Viajero (TMC)",
             "familia": "ISO/TS 18234 (TPEG)", "parte": "4", "idioma": "en (documento es hoja de ratificación europea + texto técnico en inglés)", "vigente": True},
        ],
        "amendments": [],
        # NOTA IMPORTANTE (respuesta a la petición de Andrea de incorporar
        # Eurocódigos y normativa de EE.UU. para trenes/tranvías/ferrocarriles y
        # estructuras): estos NO están en la carpeta Drive de KINEDRIK y son
        # estándares con copyright de pago (CEN/AENOR para los Eurocódigos;
        # AASHTO, AREMA y APTA para EE.UU.) — KINEDRIK no tiene una copia propia
        # subida a Drive para estos. Por la misma regla de "nunca inventar" que
        # rige todo este proyecto, no se puede generar ni reconstruir su texto
        # de cláusulas: se listan aquí solo como referencia (código, título real,
        # fuente oficial), NO como chunks de texto literal. Si KINEDRIK adquiere
        # copias con licencia y las sube a Drive, se chunkean igual que el resto.
        "normas_referenciadas_sin_texto_completo": [
            {"codigo": "Eurocódigo 0 — UNE-EN 1990", "titulo": "Bases de cálculo de estructuras", "ambito": "Estructuras (UE/España)"},
            {"codigo": "Eurocódigo 1 — UNE-EN 1991 (series)", "titulo": "Acciones en estructuras", "ambito": "Estructuras (UE/España)"},
            {"codigo": "Eurocódigo 2 — UNE-EN 1992", "titulo": "Proyecto de estructuras de hormigón", "ambito": "Estructuras (UE/España)"},
            {"codigo": "Eurocódigo 3 — UNE-EN 1993", "titulo": "Proyecto de estructuras de acero", "ambito": "Estructuras (UE/España)"},
            {"codigo": "Eurocódigo 7 — UNE-EN 1997-1/2", "titulo": "Proyecto geotécnico", "ambito": "Geotecnia (UE/España) — coincide con AESTGEO, ver documento de investigación de esa área"},
            {"codigo": "Eurocódigo 8 — UNE-EN 1998", "titulo": "Proyecto de estructuras sismorresistentes", "ambito": "Estructuras (UE/España)"},
            {"codigo": "AASHTO LRFD Bridge Design Specifications, 10ª ed. (2024)", "titulo": "Especificaciones de diseño de puentes por factores de carga y resistencia", "ambito": "Puentes y estructuras de carretera (EE.UU.)"},
            {"codigo": "AREMA Manual for Railway Engineering, ed. 2025/2026", "titulo": "Manual de ingeniería ferroviaria (vía, estructuras, señalización, electrificación)", "ambito": "Ferrocarriles (EE.UU.)"},
            {"codigo": "APTA — Track Design Handbook for Light Rail Transit, 2ª ed.", "titulo": "Manual de diseño de vía para tranvías y light rail", "ambito": "Tranvías / transporte ligero sobre raíles (EE.UU.)"},
            {"codigo": "APTA Rail Transit Systems Standards (serie APTA-RT-*)", "titulo": "Estándares de sistemas de tránsito ferroviario (vehículos, señalización, seguridad de operador)", "ambito": "Tranvías / metro ligero (EE.UU.)"},
        ],
    },
    "AOHHEAM": {
        "area_nombre": "Obras Hidráulicas y Medio Ambiente",
        "origen_folder": "Google Drive / KINEDRIK Normativa / Hidraulica_medio ambiente (parentId 1-qkxAAYx8MYknpt1u9KUY7gwMIxWKyhR)",
        "src_dir": "/tmp/kinedrik/areas/AOHHEAM_raw",
        "norms": [
            {"file": "UNE-EN_ISO_22301_2020.txt", "codigo": "UNE-EN ISO 22301:2020", "titulo": "Seguridad y resiliencia. Sistemas de gestión de la continuidad del negocio. Requisitos",
             "familia": "ISO 22301", "parte": None, "idioma": "es", "vigente": True},
            {"file": "UNE-ISO_31000_2018.txt", "codigo": "UNE-ISO 31000:2018", "titulo": "Gestión del riesgo. Directrices",
             "familia": "ISO 31000", "parte": None, "idioma": "es", "vigente": True},
            {"file": "UNE-EN_ISO_50001_2018.txt", "codigo": "UNE-EN ISO 50001:2018", "titulo": "Sistemas de gestión de la energía. Requisitos con orientación para su uso",
             "familia": "ISO 50001", "parte": None, "idioma": "es", "vigente": True},
            {"file": "UNE-EN_ISO_14044_2006.txt", "codigo": "UNE-EN ISO 14044:2006", "titulo": "Gestión ambiental. Análisis del ciclo de vida. Requisitos y directrices",
             "familia": "ISO 14044", "parte": None, "idioma": "es", "vigente": True},
            {"file": "UNE-EN_ISO_13268_2023.txt", "codigo": "UNE-EN ISO 13268:2023", "titulo": "Sistemas de canalización en materiales termoplásticos para saneamiento y alcantarillado enterrados sin presión. Módulos rectos de material termoplástico para arquetas de inspección y pozos de registro. Determinación de la rigidez circunferencial (ISO 13268:2022)",
             "familia": "ISO 13268", "parte": None, "idioma": "es", "vigente": True},
            {"file": "UNE-EN_ISO_14002-2_2025.txt", "codigo": "UNE-EN ISO 14002-2:2025", "titulo": "Sistemas de gestión ambiental. Directrices para usar la norma ISO 14001 con el fin de abordar aspectos y condiciones ambientales. Parte 2",
             "familia": "ISO 14002", "parte": "2", "idioma": "es", "vigente": True},
            {"file": "UNE-EN_1610_2016.txt", "codigo": "UNE-EN 1610:2016", "titulo": "Construcción y ensayos de desagües y redes de alcantarillado",
             "familia": "UNE-EN 1610", "parte": None, "idioma": "es", "vigente": True},
            {"file": "UNE-EN_12201-3_2024_AC_2025.txt", "codigo": "UNE-EN 12201-3:2024/AC:2025", "titulo": "Sistemas de canalización en materiales plásticos para el suministro de agua, alcantarillado y saneamiento con presión. Polietileno (PE). Parte 3: Accesorios (erratum)",
             "familia": "UNE-EN 12201", "parte": "3", "idioma": "es", "vigente": True},
            {"file": "UNE-EN_12255-7_2003.txt", "codigo": "UNE-EN 12255-7:2003", "titulo": "Plantas depuradoras de aguas residuales. Parte 7: Reactores de medio biológico fijo",
             "familia": "UNE-EN 12255", "parte": "7", "idioma": "es", "vigente": True},
            {"file": "UNE-EN_16323_2014.txt", "codigo": "UNE-EN 16323:2014", "titulo": "Glosario de términos técnicos de aguas residuales",
             "familia": "UNE-EN 16323", "parte": None, "idioma": "es", "vigente": True},
            {"file": "UNE-EN_12255-12_2024.txt", "codigo": "UNE-EN 12255-12:2024", "titulo": "Plantas depuradoras de aguas residuales. Parte 12: Control y automatización",
             "familia": "UNE-EN 12255", "parte": "12", "idioma": "es", "vigente": True},
            {"file": "UNE-EN_12255-1_2025.txt", "codigo": "UNE-EN 12255-1:2025", "titulo": "Plantas depuradoras de aguas residuales. Parte 1: Principios generales de construcción",
             "familia": "UNE-EN 12255", "parte": "1", "idioma": "es", "vigente": True},
            {"file": "UNE-EN_16941-1_2024.txt", "codigo": "UNE-EN 16941-1:2024", "titulo": "Sistemas in situ de agua no potable. Parte 1: Sistemas para la utilización de agua de lluvia",
             "familia": "UNE-EN 16941", "parte": "1", "idioma": "es", "vigente": True},
            {"file": "UNE-EN_12255-8_2025.txt", "codigo": "UNE-EN 12255-8:2025", "titulo": "Plantas depuradoras de aguas residuales. Parte 8: Tratamiento y almacenamiento de lodos",
             "familia": "UNE-EN 12255", "parte": "8", "idioma": "es", "vigente": True},
            {"file": "UNE-EN_ISO_14001_2015.txt", "codigo": "UNE-EN ISO 14001:2015", "titulo": "Sistemas de gestión ambiental. Requisitos con orientación para su uso",
             "familia": "ISO 14001", "parte": None, "idioma": "es", "vigente": True},
        ],
        "amendments": [
            {"file": "UNE-EN_ISO_45001_2023_A1_2024.txt", "norma_codigo": "UNE-EN ISO 45001:2023/A1:2024",
             "norma_titulo": "Modificación 1 a ISO 45001:2023 (Sistemas de gestión de la seguridad y salud en el trabajo): acciones relativas al cambio climático",
             "familia": "ISO 45001", "clausulas_afectadas": ["4.1", "4.2"], "vigente": True},
            {"file": "UNE-EN_ISO_14040_2006_A1_2021.txt", "norma_codigo": "UNE-EN ISO 14040:2006/A1:2021",
             "norma_titulo": "Modificación 1 a ISO 14040:2006 (Análisis del ciclo de vida — Principios y marco de referencia): actualización de definiciones y figura 1",
             "familia": "ISO 14040", "clausulas_afectadas": ["3.1", "3.32", "3.41", "3.42", "3.43", "4.2"], "vigente": True},
            {"file": "UNE-EN_ISO_14044_2006_A1_2018.txt", "norma_codigo": "UNE-EN ISO 14044:2006/A1:2018",
             "norma_titulo": "Modificación 1 a ISO 14044:2006 (Evaluación del ciclo de vida — Requisitos y directrices): huellas ambientales, nuevo Anexo C",
             "familia": "ISO 14044", "clausulas_afectadas": ["2", "3", "4.1", "Anexo C"], "vigente": True},
            {"file": "UNE-EN_ISO_50001_2018_A1_2024.txt", "norma_codigo": "UNE-EN ISO 50001:2018/A1:2024",
             "norma_titulo": "Modificación 1 a ISO 50001:2018 (Sistemas de gestión de la energía): acciones relativas al cambio climático",
             "familia": "ISO 50001", "clausulas_afectadas": ["4.1", "4.2"], "vigente": True},
            {"file": "UNE-EN_ISO_14001_2015_A1_2024.txt", "norma_codigo": "UNE-EN ISO 14001:2015/A1:2024",
             "norma_titulo": "Modificación 1 a ISO 14001:2015 (Sistemas de gestión ambiental): acciones relativas al cambio climático",
             "familia": "ISO 14001", "clausulas_afectadas": ["4.1", "4.2"], "vigente": True},
        ],
    },
    "AENERPM": {
        "area_nombre": "Energía y Minas",
        "origen_folder": "Google Drive / KINEDRIK Normativa / MERYEE+ (parentId 1q8VFtLnuHWYeZp9bX96OSdO2J6BSYybT)",
        "src_dir": "/tmp/kinedrik/areas/AENERPM_raw",
        "norms": [
            {"file": "UNE-EN_60904-2_2015.txt", "codigo": "UNE-EN 60904-2:2015", "titulo": "Dispositivos fotovoltaicos. Parte 2: Requisitos de dispositivos solares de referencia (IEC 60904-2:2015)",
             "familia": "IEC 60904", "parte": "2", "idioma": "es", "vigente": True},
            {"file": "UNE-EN_ISO_17827-1_2024.txt", "codigo": "UNE-EN ISO 17827-1:2024", "titulo": "Biocombustibles sólidos. Determinación de la distribución de tamaño de partícula para combustibles sin comprimir. Parte 1: Método del tamiz oscilante con abertura de malla igual o superior a 3,15 mm (ISO 17827-1:2024)",
             "familia": "ISO 17827", "parte": "1", "idioma": "es", "vigente": True},
            {"file": "UNE-EN_ISO_17827-2_2024.txt", "codigo": "UNE-EN ISO 17827-2:2024", "titulo": "Biocombustibles sólidos. Determinación de la distribución de tamaño de partícula para combustibles sin comprimir. Parte 2: Método de la criba vibratoria usando tamices con abertura de malla inferior o igual a 3,15 mm (ISO 17827-2:2024)",
             "familia": "ISO 17827", "parte": "2", "idioma": "es", "vigente": True},
            {"file": "UNE-EN_IEC_61400-8_2025.txt", "codigo": "UNE-EN IEC 61400-8:2025", "titulo": "Sistemas de generación de energía eólica. Parte 8: Diseño de componentes estructurales de aerogeneradores",
             "familia": "IEC 61400", "parte": "8", "idioma": "es", "vigente": True},
            {"file": "UNE-EN_IEC_61400-50_2023.txt", "codigo": "UNE-EN IEC 61400-50:2023", "titulo": "Sistemas de generación de energía eólica. Parte 50: Medición del viento. Visión general (IEC 61400-50:2022)",
             "familia": "IEC 61400", "parte": "50", "idioma": "es", "vigente": True},
            {"file": "UNE-EN_12977-5_2019.txt", "codigo": "UNE-EN 12977-5:2019", "titulo": "Sistemas solares térmicos y sus componentes. Instalaciones a medida. Parte 5: Métodos de ensayo del rendimiento para los sistemas de regulación",
             "familia": "UNE-EN 12977", "parte": "5", "idioma": "es", "vigente": True},
            {"file": "UNE-EN_15316-4-3_2018.txt", "codigo": "UNE-EN 15316-4-3:2018", "titulo": "Eficiencia energética de los edificios. Método para el cálculo de las demandas energéticas y de las eficiencias de los sistemas. Parte 4-3: Sistemas de generación de calor, sistemas solares térmicos y fotovoltaicos, Módulos M3-8-3, M8-8-3, M11-8-3",
             "familia": "UNE-EN 15316", "parte": "4-3", "idioma": "es", "vigente": True},
            {"file": "UNE-CWA_17727_2022.txt", "codigo": "UNE-CWA 17727:2022", "titulo": "Desarrollo de la resiliencia de las ciudades. Guía para combinar la gestión de riesgos de desastres y la adaptación al cambio climático. Zonas históricas",
             "familia": "CWA 17727", "parte": None, "idioma": "es", "vigente": True},
            {"file": "UNE_178107-4_2015_IN.txt", "codigo": "UNE 178107-4 IN:2015", "titulo": "Guía para las infraestructuras de Ciudades Inteligentes. Redes de acceso y transporte. Parte 4: Redes de Sensores, WSN",
             "familia": "UNE 178107", "parte": "4", "idioma": "es", "vigente": True},
            {"file": "UNE_178101-1_2015.txt", "codigo": "UNE 178101-1:2015", "titulo": "Ciudades Inteligentes. Infraestructuras. Redes de los Servicios Públicos. Parte 1: Redes de aguas",
             "familia": "UNE 178101", "parte": "1", "idioma": "es", "vigente": True},
            {"file": "UNE_178101-2_2018.txt", "codigo": "UNE 178101-2:2018", "titulo": "Ciudades Inteligentes. Infraestructuras. Redes de los Servicios Públicos. Parte 2: Redes de residuos",
             "familia": "UNE 178101", "parte": "2", "idioma": "es", "vigente": True},
            {"file": "UNE_178101-5-1_2015.txt", "codigo": "UNE 178101-5-1:2015", "titulo": "Ciudades Inteligentes. Infraestructuras. Redes de los Servicios Públicos. Parte 5-1: Redes de energía. Electricidad",
             "familia": "UNE 178101", "parte": "5-1", "idioma": "es", "vigente": True},
        ],
        "amendments": [],
        # NOTA — REQUIERE VALIDACIÓN: las Normas UNE 178101-1 (Redes de aguas) y UNE 178101-2
        # (Redes de residuos), y UNE 178107-4 IN (Redes de sensores WSN) pertenecen formalmente
        # a la serie "Ciudades Inteligentes" (AEN/CTN 178), no a energía en sentido estricto.
        # Aparecieron en la carpeta Drive MERYEE+ (Energía y Minas) de KINEDRIK, pero su encaje
        # correcto podría ser un área de Ciudades Inteligentes / Infraestructuras Digitales
        # (posiblemente ATRDIGI) en lugar de AENERPM. Se han incluido aquí porque es donde
        # KINEDRIK las tiene archivadas, pero esta clasificación debe ser confirmada por el
        # equipo KINEDRIK antes de darla por definitiva. Sólo UNE 178101-5-1 (Redes de energía.
        # Electricidad) encaja de forma inequívoca en AENERPM.
    },
    "ARQYURB": {
        "area_nombre": "Arquitectura y Urbanismo",
        "origen_folder": "Google Drive / KINEDRIK Normativa / EDIFICIOS (parentId 1YUhCvaqS3OYEuK-uKuyl0G8F4y9hA6Ll) + MSMART+ (parentId 12xBnUI2hVpWfho6p8d1v_2VhxLKeza2D)",
        "src_dir": "/tmp/kinedrik/areas/ARQYURB_raw",
        "norms": [
            {"file": "UNE-ISO_37120_2015.txt", "codigo": "UNE-ISO 37120:2015", "titulo": "Desarrollo sostenible en las ciudades. Indicadores para los servicios urbanos y la calidad de vida",
             "familia": "ISO 37120", "parte": None, "idioma": "es", "vigente": True},
            {"file": "UNE-EN_ISO_37101_2022.txt", "codigo": "UNE-EN ISO 37101:2022", "titulo": "Desarrollo sostenible en las comunidades. Sistema de gestion para el desarrollo sostenible. Requisitos con orientacion para su uso (ISO 37101:2016)",
             "familia": "ISO 37101", "parte": None, "idioma": "en", "vigente": True},
            {"file": "UNE_178201_2016.txt", "codigo": "UNE 178201:2016", "titulo": "Ciudades inteligentes. Definicion, atributos y requisitos",
             "familia": "UNE 178201", "parte": None, "idioma": "es", "vigente": True},
            {"file": "UNE_178102-1_2015.txt", "codigo": "UNE 178102-1:2015", "titulo": "Ciudades Inteligentes. Infraestructuras. Sistemas de telecomunicacion. Parte 1: Red Municipal Multiservicio",
             "familia": "UNE 178102", "parte": "1", "idioma": "es", "vigente": True},
            {"file": "UNE_178401_2017.txt", "codigo": "UNE 178401:2017", "titulo": "Ciudades inteligentes. Alumbrado exterior. Grados de funcionalidad, zonificacion y arquitectura de gestion",
             "familia": "UNE 178401", "parte": None, "idioma": "es", "vigente": True},
            {"file": "UNE_178402_2015.txt", "codigo": "UNE 178402:2015", "titulo": "Ciudades inteligentes. Gestion de servicios basicos y suministro de agua y energia electrica en puertos inteligentes",
             "familia": "UNE 178402", "parte": None, "idioma": "es", "vigente": True},
            {"file": "UNE-ISO_IWA_48_2025.txt", "codigo": "UNE-ISO/IWA 48:2025", "titulo": "Implementacion de principios ambientales, sociales y de gobernanza (ESG)",
             "familia": "ISO IWA 48", "parte": None, "idioma": "es", "vigente": True},
            {"file": "UNE_166002_2021.txt", "codigo": "UNE 166002:2021", "titulo": "Gestion de la I+D+i: Requisitos del Sistema de Gestion de la I+D+i",
             "familia": "UNE 166002", "parte": None, "idioma": "es", "vigente": True},
            {"file": "UNE-EN_ISO_52000-1_2019.txt", "codigo": "UNE-EN ISO 52000-1:2019", "titulo": "Eficiencia energetica de los edificios. Evaluacion global de la eficiencia energetica de los edificios. Parte 1: Marco general y procedimientos (ISO 52000-1:2017)",
             "familia": "ISO 52000", "parte": "1", "idioma": "es", "vigente": True},
            {"file": "UNE-CEN_ISO_TR_52000-2_2017.txt", "codigo": "UNE-CEN ISO/TR 52000-2:2017", "titulo": "Eficiencia energetica de los edificios. Evaluacion global de la EPB. Parte 2: Explicacion y justificacion de la norma ISO 52000-1",
             "familia": "ISO 52000", "parte": "2 (TR)", "idioma": "en", "vigente": True},
            {"file": "UNE-EN_ISO_52016-3_2024.txt", "codigo": "UNE-EN ISO 52016-3:2024", "titulo": "Eficiencia energetica de los edificios. Necesidades energeticas para calefaccion y refrigeracion, temperaturas interiores y cargas termicas sensibles y latentes. Parte 3",
             "familia": "ISO 52016", "parte": "3", "idioma": "es", "vigente": True},
            {"file": "UNE-EN_ISO_52022-3_2017.txt", "codigo": "UNE-EN ISO 52022-3:2017", "titulo": "Eficiencia energetica de los edificios. Propiedades termicas, solares y de luz diurna de los componentes de los edificios y sus elementos. Parte 3: Metodo detallado de calculo de las caracteristicas solares y de luz diurna de los dispositivos de proteccion solar combinados con acristalamiento",
             "familia": "ISO 52022", "parte": "3", "idioma": "en", "vigente": True},
            {"file": "UNE-CEN_ISO_TR_52003-2_2017.txt", "codigo": "UNE-CEN ISO/TR 52003-2:2017", "titulo": "Eficiencia energetica de los edificios. Indicadores, requisitos, niveles y certificacion. Parte 2: Explicaciones y justificacion para la Norma ISO 52003-1",
             "familia": "ISO 52003", "parte": "2 (TR)", "idioma": "en", "vigente": True},
            {"file": "UNE-CEN_TS_16628_2024.txt", "codigo": "UNE-CEN/TS 16628:2024", "titulo": "Eficiencia energetica de los edificios. Principios basicos para la serie de normas sobre eficiencia energetica de los edificios",
             "familia": "CEN/TS 16628", "parte": None, "idioma": "en", "vigente": True},
            {"file": "UNE-CEN_TS_16629_2024.txt", "codigo": "UNE-CEN/TS 16629:2024", "titulo": "Eficiencia energetica de los edificios. Reglas tecnicas detalladas para la serie de normas sobre eficiencia energetica de los edificios",
             "familia": "CEN/TS 16629", "parte": None, "idioma": "en", "vigente": True},
            {"file": "UNE-EN_15193-1_2019_A1_2022.txt", "codigo": "UNE-EN 15193-1:2019+A1:2022", "titulo": "Eficiencia energetica de los edificios. Requisitos energeticos para la iluminacion. Parte 1: Especificaciones, modulo M9",
             "familia": "UNE-EN 15193", "parte": "1", "idioma": "es", "vigente": True},
            {"file": "UNE-EN_16798-5-2_2018.txt", "codigo": "UNE-EN 16798-5-2:2018", "titulo": "Eficiencia energetica de los edificios. Ventilacion de los edificios. Parte 5-2: Metodos de calculo para las demandas energeticas de los sistemas de ventilacion (Modulos M5-6, M5-8, M5-1, M6-5, M6-8, M6-1)",
             "familia": "UNE-EN 16798", "parte": "5-2", "idioma": "es", "vigente": True},
            {"file": "UNE-EN_15316-4-5_2018.txt", "codigo": "UNE-EN 15316-4-5:2018", "titulo": "Eficiencia energetica de los edificios. Metodo para el calculo de las demandas energeticas y de las eficiencias de los sistemas. Parte 4-5: Redes de calor y frio, Modulos M3-8-5, M4-8-5",
             "familia": "UNE-EN 15316", "parte": "4-5", "idioma": "es", "vigente": True},
            {"file": "UNE-EN_17956_2024.txt", "codigo": "UNE-EN 17956:2024", "titulo": "Clases de eficiencia energetica para sistemas de aislamiento tecnico. Metodo de calculo y aplicaciones",
             "familia": "UNE-EN 17956", "parte": None, "idioma": "es", "vigente": True},
            {"file": "UNE-EN_ISO_14067_2019.txt", "codigo": "UNE-EN ISO 14067:2019", "titulo": "Gases de efecto invernadero. Huella de carbono de productos. Requisitos y directrices para cuantificacion (ISO 14067:2018)",
             "familia": "ISO 14067", "parte": None, "idioma": "es", "vigente": True},
            {"file": "UNE-EN_16883_2018.txt", "codigo": "UNE-EN 16883:2018", "titulo": "Conservacion del patrimonio cultural. Guia para la mejora de la eficiencia energetica de los edificios historicos",
             "familia": "UNE-EN 16883", "parte": None, "idioma": "es", "vigente": True},
        ],
        "amendments": [
            {"file": "UNE-EN_ISO_37101_2022_A1_2024.txt", "norma_codigo": "UNE-EN ISO 37101:2022/A1:2024",
             "norma_titulo": "Modificacion 1 a ISO 37101:2016 (Desarrollo sostenible en las comunidades. Sistema de gestion): acciones relativas al cambio climatico",
             "familia": "ISO 37101", "clausulas_afectadas": ["4.1", "4.2"], "vigente": True},
        ],
        # NOTA - REQUIERE VALIDACION: esta area agrupa documentos reales de las carpetas Drive
        # "EDIFICIOS" y "MSMART+" de KINEDRIK. Varios documentos aparecian duplicados en ambas
        # carpetas (UNE-CWA 17727:2022, UNE 178101-1/2/5-1:2015/2018, UNE 178107-4 IN:2015,
        # UNE 178102-1:2015) - los duplicados normativos de energia/redes ya se han incorporado
        # en AENERPM y NO se repiten aqui para evitar doble conteo; UNE 178102-1:2015
        # (telecomunicaciones) se ha mantenido en ARQYURB por encajar mejor en infraestructuras
        # urbanas/edificacion. Por alcance y tiempo de esta sesion, no se han procesado todos
        # los documentos de ambas carpetas (quedan pendientes, entre otros: 8552020_CEN_ISO_PDF
        # = ISO/TR 52018-2:2017, 8553604_CEN_ISO_PDF = ISO/TR 52022-2:2017, y la serie
        # UNE-EN ISO 16484 partes 1/2/3/6 sobre automatizacion y control de edificios BACS) -
        # deben anadirse en una proxima iteracion siguiendo el mismo patron. Se excluyeron
        # deliberadamente de esta KB por no ser normas (solo referencias bibliograficas, no
        # chunkeadas): "normas.pdf" (presentacion sobre normalizacion, no una norma en si),
        # "Quest_for_a_Tool_Measuring_Urban_Quality_of_Life_I.pdf" (articulo academico),
        # "Design_and_Implementation_of_Smart_Buildings_A_Rev.pdf" (articulo academico),
        # "Dialnet-DomoticaYLosObjetivosDeDesarrolloSostenibleDeLaAge-10129595.pdf" (articulo
        # academico), "36428-2.pdf" (articulo de revista, Revista BIT sobre smart buildings) y
        # "BVCM005729.pdf" (guia divulgativa de la Comunidad de Madrid sobre domotica, sin
        # estructura de clausulas normativas).
    },
}


def clean_text(t):
    return t.replace('\x0c', '\n')


def find_body_start(text):
    lines = text.split('\n')
    idxs = [i for i, l in enumerate(lines) if re.match(r'^(0|1)\s+(Introducci[oó]n|Objeto)', l.strip())]
    if len(idxs) >= 2:
        return sum(len(l) + 1 for l in lines[:idxs[1]])
    return 0


def is_toc_line(line):
    return '....' in line or bool(re.search(r'\.{4,}', line))


def chunk_norm(meta, src_dir, area_code, area_name, origen_folder):
    path = os.path.join(src_dir, meta["file"])
    raw = clean_text(open(path, encoding='utf-8').read())
    start = find_body_start(raw)
    body = raw[start:] if start else raw

    matches = list(HEAD_RE.finditer(body))
    chunks = []
    for i, m in enumerate(matches):
        num = m.group('num')
        title = m.group('title').strip().rstrip('.')
        if is_toc_line(m.group(0)) or any(s in title for s in STOPWORDS_TITLE):
            continue
        if len(title) < 3:
            continue
        seg_start = m.end()
        seg_end = matches[i + 1].start() if i + 1 < len(matches) else min(len(body), seg_start + 6000)
        content = body[seg_start:seg_end].strip()
        toc_leak = re.search(r'\.{4,}', content)
        if toc_leak and toc_leak.start() < 200:
            content = content[:toc_leak.start()].strip()
        content = re.sub(r'\n{3,}', '\n\n', content)
        if len(content) < 15:
            continue
        chunks.append({"num": num, "title": title, "content": content[:4000]})

    anexo_matches = [m for m in ANEXO_RE.finditer(body) if not is_toc_line(m.group(0))]
    for i, m in enumerate(anexo_matches):
        num = m.group('num')
        title = m.group('title').strip().rstrip('.')
        seg_start = m.end()
        seg_end = anexo_matches[i + 1].start() if i + 1 < len(anexo_matches) else min(len(body), seg_start + 4000)
        content = body[seg_start:seg_end].strip()
        toc_leak = re.search(r'\.{4,}', content)
        if toc_leak and toc_leak.start() < 200:
            content = content[:toc_leak.start()].strip()
        content = re.sub(r'\n{3,}', '\n\n', content)
        if len(content) < 15:
            continue
        chunks.append({"num": num, "title": title, "content": content[:4000]})

    best = {}
    for c in chunks:
        key = c["num"]
        score = len(c["content"]) - (50 if SCRAMBLE_RE.search(c["title"]) else 0)
        if key not in best or score > best[key][0]:
            best[key] = (score, c)

    def sort_key(c):
        if c["num"].startswith("Anexo"):
            return (1, c["num"])
        return (0, [int(x) for x in c["num"].split('.')])

    chunks = sorted((v[1] for v in best.values()), key=sort_key)

    out = []
    for c in chunks:
        level = 1 if c["num"].startswith("Anexo") else c["num"].count('.') + 1
        chunk_id = f"{meta['codigo'].split(':')[0].replace(' ', '_').replace('/', '-')}_{c['num'].replace(' ', '_')}"
        uid = hashlib.sha1(chunk_id.encode()).hexdigest()[:10]
        reflow = bool(SCRAMBLE_RE.search(c["content"][:200]))
        out.append({
            "chunk_id": f"{chunk_id}#{uid}",
            "norma_codigo": meta["codigo"],
            "norma_titulo": meta["titulo"],
            "familia": meta["familia"],
            "parte": meta["parte"],
            "area_codigo": area_code,
            "area_nombre": area_name,
            "apartado": c["num"],
            "nivel": level,
            "titulo_apartado": c["title"],
            "idioma": meta["idioma"],
            "extracto": c["content"],
            "n_caracteres": len(c["content"]),
            "fuente_verificada": True,
            "vigente_segun_texto": meta["vigente"],
            "estado_revision": "REVISAR VIGENCIA" if not meta["vigente"] else ("REQUIERE VALIDACIÓN (posible reflujo de columnas en extracción PDF)" if reflow else "OK"),
            "posible_reflujo_texto": reflow,
            "fecha_extraccion": datetime.date.today().isoformat(),
            "origen": origen_folder,
        })
    return out


def chunk_amendment(am, src_dir, area_code, area_name, origen_folder):
    """Las modificaciones/amendments cortas se registran íntegras como un único
    chunk 'amendment', nunca fusionadas en la norma base, y se listan las
    cláusulas que tocan para que la skill pueda avisar al usuario."""
    path = os.path.join(src_dir, am["file"])
    text = clean_text(open(path, encoding='utf-8').read()).strip()
    chunk_id = f"{am['norma_codigo'].replace(' ', '_').replace('/', '-')}#amdmt"
    return [{
        "chunk_id": chunk_id,
        "norma_codigo": am["norma_codigo"],
        "norma_titulo": am["norma_titulo"],
        "familia": am["familia"],
        "parte": None,
        "area_codigo": area_code,
        "area_nombre": area_name,
        "apartado": "modificación completa",
        "nivel": 1,
        "titulo_apartado": f"Modificación — afecta cláusulas {', '.join(am['clausulas_afectadas'])} de la norma base",
        "idioma": "es",
        "extracto": text,
        "n_caracteres": len(text),
        "fuente_verificada": True,
        "vigente_segun_texto": am["vigente"],
        "estado_revision": "OK — documento corto de modificación, no tiene apartados propios",
        "posible_reflujo_texto": False,
        "fecha_extraccion": datetime.date.today().isoformat(),
        "origen": origen_folder,
    }]


def build_area(area_code, cfg):
    all_chunks = []
    per_norm_report = []
    for meta in cfg["norms"]:
        chunks = chunk_norm(meta, cfg["src_dir"], area_code, cfg["area_nombre"], cfg["origen_folder"])
        all_chunks.extend(chunks)
        per_norm_report.append({"norma": meta["codigo"], "apartados_extraidos": len(chunks)})
        print(f"  {meta['codigo']:45s} -> {len(chunks):3d} apartados")
    for am in cfg.get("amendments", []):
        chunks = chunk_amendment(am, cfg["src_dir"], area_code, cfg["area_nombre"], cfg["origen_folder"])
        all_chunks.extend(chunks)
        per_norm_report.append({"norma": am["norma_codigo"], "apartados_extraidos": len(chunks)})
        print(f"  {am['norma_codigo']:45s} -> {len(chunks):3d} (modificación, chunk único)")

    kb = {
        "metadata": {
            "product_name": f"KINEDRIK Normativa RAG - Base de Conocimiento (área {cfg['area_nombre']})",
            "version": "0.1.0",
            "generated_at": datetime.datetime.now().isoformat(),
            "generator": "Claude (Cowork) - extracción literal desde PDFs UNE/EN/ISO reales (Google Drive KINEDRIK)",
            "area_codigo": area_code,
            "area_nombre": cfg["area_nombre"],
            "total_normas": len(cfg["norms"]) + len(cfg.get("amendments", [])),
            "total_chunks": len(all_chunks),
            "metodo": "Chunking por apartado/cláusula numerada (regex sobre texto extraído del PDF), deduplicado, sin generación de contenido: cada 'extracto' es texto literal de la norma.",
            "regla_no_invencion": "Ningún campo 'extracto' contiene texto generado; es una cita literal recortada del documento fuente.",
        },
        "normas": cfg["norms"] + cfg.get("amendments", []),
        "chunks": all_chunks,
        "cobertura": per_norm_report,
    }
    out_path = os.path.join(OUT_DIR, f"kinedrik_normativa_kb_{area_code}_v0.1.0.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(kb, f, ensure_ascii=False, indent=2)
    print(f"  Total {area_code}: {len(all_chunks)} chunks -> {out_path} ({os.path.getsize(out_path)/1024:.1f} KB)\n")
    return kb


def main():
    for area_code, cfg in AREAS.items():
        print(f"=== Área {area_code} ({cfg['area_nombre']}) ===")
        build_area(area_code, cfg)


if __name__ == "__main__":
    main()
