# UNE-EN ISO 19650-4:2023 — Gestión de la información al utilizar BIM. Parte 4: Intercambio de información (ISO 19650-4:2022)

Texto normativo de referencia (resumen fiel de los requisitos). Citar la cláusula exacta (por ejemplo "ISO 19650-4, 6.1" o "7.5").

## 0 Introducción
- Las normas ISO 19650-1, -2 y -3 exigen compartir la información como parte de procesos colaborativos y convergentes. ISO 19650-4 complementa a las demás proporcionando procesos y criterios explícitos para cada intercambio de información.
- Un contenedor de información: recibe un identificador persistente y metadatos; puede recuperarse en un CDE con metadatos de estado adecuados; y se hace persistente mediante revisión y archivado sistemático.
- El aseguramiento y control de calidad permite cumplir un requisito específico de intercambio mediante criterios de integridad, conformidad con esquemas, continuidad entre intercambios, y eliminación de conflictos espaciales y de especificación.

## 1 Objeto y campo de aplicación
- Especifica el proceso detallado y los criterios de decisión para ejecutar un intercambio de información, para garantizar la calidad del modelo de información del proyecto o del activo.
- Aplicable a cualquier intercambio durante la fase de producción (ISO 19650-2) y a los eventos desencadenantes de la fase de operación (ISO 19650-3).

## 2 Normas para consulta
- ISO 6707-1; ISO 6707-2; ISO 19650-1:2018; ISO 19650-2:2018; ISO 19650-3:2020; ISO 19650-5.

## 3 Términos y definiciones
- 3.1.1 etapa: periodo concreto durante un proyecto utilizado como herramienta de gestión. Suele terminar en un punto clave de decisión.
- 3.2.1 proveedor de información: actor que proporciona información en un contenedor de información.
- 3.2.2 receptor de información: actor que recibe información en un contenedor. Puede ser el adjudicador o el adjudicatario principal responsable de autorizar y aceptar la información en el estado publicado.
- 3.2.3 revisor de información: actor que revisa la información y su contenedor. Puede ser un agente de inteligencia artificial o un proceso automatizado basado en reglas.

## 4 Resumen del proceso
Cada intercambio de información, ya se realice durante o al final de una etapa o de un evento desencadenante, debe ejecutarse conforme a ISO 19650-2 (5.6 y 5.7) o ISO 19650-3 (5.6), junto con los acuerdos de gobernanza. Flujo (figura 1):
1. Generar trabajos en curso (5.1).
2. Utilizar el estado compartido (5.2).
3. Utilizar el estado publicado (5.3).
4. Desarrollar las acciones de cambio (5.4).
- Decisión A: aprobar para compartir (a1, 6.1), o cambiar la acción (a0, 5.4), u omitir el estado compartido (a2, 6.4).
- Decisión B: autorizar y aceptar para publicación (b1, 6.2), o acción de cambio (b0, 5.4).

## 5 Etapas del proceso

### 5.1 Movilización y producción de información
**5.1.1** Durante las etapas de desarrollo y los eventos desencadenantes en la operación, los proveedores de información deben generar la información y desarrollar los contenedores utilizando recursos y referencias compartidos o publicados, como trabajo en curso.

**5.1.2 Movilización y pruebas previas al intercambio.** Los métodos y procedimientos de intercambio deben probarse antes de finalizar los requisitos e intercambiar entregables. El proveedor debe revisar y confirmar el software de trabajo seleccionado y debe elegir un software que permita: importar los esquemas y formatos de datos de referencia pertinentes; exportar los esquemas y formatos solicitados; e interactuar con la herramienta acordada para registrar y gestionar problemas y riesgos. Receptores y revisores deben confirmar las versiones de formatos abiertos y propietarios que se van a utilizar. Deben considerar la necesidad y los beneficios del intercambio, usando esquemas abiertos y formatos normalizados que permitan la colaboración, y formatos propietarios o nativos solo cuando no perjudiquen necesidades inmediatas o futuras. Deben comprobar que el software de revisión e integración es capaz de importar a un contenedor persistente, federar mediante aplicaciones para crear un recurso temporal, y vincular como referencias de información o web semántica. (Anexo A resume los esquemas y formatos abiertos.)

**5.1.3 Implementación.** Todo desarrollo e intercambio debe realizarse conforme a las disposiciones de seguridad o al plan de gestión de la seguridad (ISO 19650-5). El proveedor debe planificar el intercambio para apoyar el trabajo colaborativo y el proceso CDE (ISO 19650-1, capítulo 12), e intercambiar conforme a la gobernanza acordada con el estado apropiado: cuando la información esté en un estado coherente; al inicio de una etapa o de un evento desencadenante; y a menudo, cuando se hayan realizado cambios.

### 5.2 Estado compartido
Los revisores deben examinar el contenedor según los criterios de revisión del capítulo 7, usando la información compartida como referencia y contexto cuando sea necesario. Véase la decisión A (6.1).

### 5.3 Estado publicado
El receptor debe utilizar la información intercambiada en el estado publicado para las decisiones clave, la finalización de una etapa de desarrollo o de un evento desencadenante en la operación, y para las siguientes etapas y eventos. Véase la decisión B (6.2).

### 5.4 Acciones de cambio
**5.4.1 Generalidades.** Puede ser necesaria una acción de cambio por problemas y riesgos identificados en la decisión A o B.
- **5.4.2 Identificar problemas y riesgos.** El revisor debe revisar la información para identificar problemas y riesgos relacionados con el propósito del intercambio (por ejemplo, comparar modelos de coordinación con modelos compartidos, o comprobar que un informe utiliza los identificadores de equipo acordados). Un registro colaborativo de incidencias puede contener los riesgos de entrega de información (ISO 19650-2, 5.3.6; ISO 19650-3, 5.3.6).
- **5.4.3 Asignar problemas y riesgos.** El revisor debe documentar todos los problemas identificados para su revisión y la adopción de medidas correctoras por el adjudicatario principal o según la adjudicación. Puede asignarse directamente o requerir una revisión colaborativa. La documentación puede hacerse en BCF u otros mensajes o anotaciones.
- **5.4.4 Aplicar los cambios.** El proveedor debe aplicar las medidas y cambios en el estado de trabajo en curso, volviendo a 5.1.3. Solo el proveedor puede editar y revisar un contenedor en estado de trabajo en curso.

## 6 Decisiones sobre el cambio de estado

### 6.1 Decisión A: aprobación para compartir
El proveedor debe revisar su información con los criterios del capítulo 7 antes de conceder o denegar la aprobación para pasar al estado compartido (ISO 19650-1, 12.3; ISO 19650-2, 5.6.3; ISO 19650-3, 5.6.3). Debe considerar la eficacia de: los procesos de aseguramiento de la calidad del emisor para garantizar el cumplimiento; y los procesos de control de calidad del proveedor y de los receptores para comprobarlo.

### 6.2 Decisión B: autorización y aceptación para publicación
El receptor debe revisar el contenedor con los criterios del capítulo 7 y debe rechazar, o autorizar y aceptar el estado publicado (ISO 19650-1, 12.5; ISO 19650-2, 5.7.2; ISO 19650-3, 5.6.6). Puede hacerse en dos pasos: autorización del adjudicatario principal y aceptación del adjudicador (ISO 19650-2, 5.7.4; ISO 19650-3, 5.7.2). Los revisores deben considerar la eficacia de los procesos de control y aseguramiento de la calidad aplicados antes y después de compartir.

### 6.3 Criterios de decisión
Un revisor debe aprobar el intercambio antes de la decisión A o de la decisión B si se cumplen los criterios de aceptación del capítulo 7. Si no se cumplen, debe indicar las cuestiones pertinentes para su resolución. Todos los criterios deben aplicarse a cada contenedor, salvo lo permitido en 6.4. Los criterios pueden provenir de ISO/TS 12911, ISO 29481-1 y EN 17412-1, así como de la norma de información, los recursos compartidos, los métodos de producción y los EIR. La información estructurada y los procesos coherentes facilitan la comprobación automática de la conformidad. La aceptación parcial se trata en ISO 19650-2 (5.7.2 y 5.7.4) e ISO 19650-3 (5.6.6 y 5.7.2).

### 6.4 Excepciones
El proceso de revisión puede excluir contenedores que no estén sujetos a revisión o cambio, siempre que los receptores verifiquen la calidad, la nomenclatura y los metadatos. Pueden eximirse: representaciones electrónicas de evidencias físicas de administración, certificados y documentos de aceptación; señales directas de control de procesos, una vez establecidos los filtros automáticos; fotografías, escaneos y material de vídeo.

## 7 Criterios para revisar un intercambio de información

### 7.1 Entorno común de datos (CDE)
El revisor debe comprobar que los requisitos de nomenclatura y metadatos del CDE se aplican correctamente, y los metadatos que describen la información necesaria para el flujo de trabajo y el contenido del contenedor. Debe comprobar que no se han infringido los requisitos de seguridad y tratamiento, en particular la visibilidad del contenedor para otras partes.

### 7.2 Conformidad
El revisor debe comprobar que el contenedor cumple con el esquema de intercambio y el formato de datos elegidos. Ejemplo: que el esquema cumple ISO 16739-1 (IFC) y que el formato cumple ISO 10303-21, según lo acordado en la norma de información.

### 7.3 Continuidad
El revisor debe comprobar la continuidad del contenido frente a: otros contenedores; versiones anteriores del contenedor; cambios de estado anteriores; fases de producción y eventos desencadenantes; y fases de desarrollo o de operación previas. Debe comprobar la continuidad respecto a: la co-localización geoespacial (geolocalización, emplazamiento, activos); la coordinación de calendarios; la denominación de entidades espaciales, físicas y de proceso (proceso, emplazamiento, instalación, planta/área, tipos, sistemas, zonas, lotes); la denominación de entidades de espacio, componentes y tareas; y la denominación de atributos, materiales y formas/perfiles.

### 7.4 Comunicación
El revisor debe comprobar que la información intercambiada puede ser o ha sido almacenada sin degradación ni pérdida por traducción o conversión. Debe tener en cuenta el formato de fecha o hipótesis de calendario, las unidades de medida y la codificación de caracteres. Puede comparar mediante inspección visual, informes y/o tamaño de archivos y sumas de control (checksums).

### 7.5 Coherencia
El revisor debe comprobar la coherencia interna con cualquier contenedor referenciado: coherencia espacial, física y de procesos (sin duplicidades, solapamientos ni vacíos); coherencia de atributos y propiedades (sin contradicciones); huecos o solapamientos con contenedores adyacentes dentro de la estrategia de federación; asignación correcta a otros contenedores; y precisión adecuada (cuantitativa en localización y propiedades, y temática en clasificación y texto). Debe tener en cuenta el código de estado previsto antes del estado compartido o el asignado antes del estado publicado (ISO 19650-1, 3.3.12 y 12.1).

### 7.6 Integridad (completeness)
El revisor debe comprobar la presencia y adecuación de la información respecto al nivel de información necesario especificado por el EIR y cualquier expectativa adicional. Debe tener en cuenta: cumplir los objetivos de la fase de desarrollo o de los eventos desencadenantes; apoyar la supervisión y coordinación (espacial, física y de procesos); y permitir la gestión a largo plazo mediante denominación normalizada, clasificación y normas abiertas. Debe usar un procedimiento formalizado para comprobar los requisitos o listas de comprobación derivadas, que puede incluir reglas automatizadas, y compartir los procedimientos de comprobación con los proveedores. Las definiciones de IDM, MVD e IDS pueden ayudar a comprobar la integridad (ISO 29481-1 e ISO 29481-3).

### 7.7 Otros criterios (informativos)
El revisor puede comprobar el cumplimiento de requisitos de producción y/o operación con herramientas de evaluación y análisis. Puede considerar criterios funcionales; capacidad y criterios de rendimiento; normas técnicas; requisitos comerciales y legales; y consideraciones de seguridad y salud. Es especialmente importante al final de cada etapa o evento (CEN/TR 17439-1, 6.4).

## Anexo A (informativo) — Normas de esquemas y formatos de datos abiertos
- Esquemas abiertos: IFC (ISO 16739-1; .ifc, .ifcxml); GML (ISO 19136; .gml); Posc/Cesar (ISO 15926; .spf). Otros sectoriales: CAFMconnect, COBie, CFIHOS, Oscre.
- Formatos abiertos: hojas de cálculo (ISO 29500: .docx, .xlsx, .csv); PDF de archivo (ISO 19005: .pdf); documentos de oficina (ISO/IEC 26300: .odt, .ods, .odp); SQL (ISO 9075-1: .sql); imágenes (ISO/IEC 10918: .jpg; ISO/IEC 15948: .png); contenedores de paquetes (ISO 21597: .icdd).
- BCF (Building Collaboration Format) es un esquema abierto para identificar, comunicar e intercambiar incidencias.
