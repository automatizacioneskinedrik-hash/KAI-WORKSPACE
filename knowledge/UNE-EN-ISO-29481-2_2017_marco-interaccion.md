# UNE-EN ISO 29481-2:2017 — Modelado de la información de los edificios. Manual de entrega de la información. Parte 2: Marco de trabajo para la interacción (ISO 29481-2:2012)

Texto normativo de referencia (resumen fiel de los principios y del formato). Citar la cláusula exacta (por ejemplo "ISO 29481-2, 4.4" o "5.2.2").

## 0 Introducción
- El modelado de información de edificios aúna los conjuntos de información de la construcción en un entorno común. Para ello hace falta una comprensión común de los procesos de construcción y de la información necesaria.
- Esta parte se centra en la gestión y coordinación de las partes involucradas. La coordinación depende de la comunicación, que debe ser bien estructurada, inequívoca, explícita y ágil. Complementa las normas de construcción de modelos (ISO 10303-239 e ISO 16739).
- Establece una metodología y un formato para describir las acciones de coordinación entre los agentes de un proyecto: los procesos de coordinación y la información requerida para ejecutarlos. Los marcos de interacción permiten estandarizar la interacción a nivel nacional, local y de proyecto.

## 1 Objeto y campo de aplicación
- Especifica una metodología y un formato para describir las "acciones de coordinación" entre los agentes de un proyecto durante todas las etapas del ciclo de vida: una metodología que describe el marco de interacción; una forma de asignar responsabilidades e interacciones que proporciona el contexto de proceso para el flujo de información; y un formato en el que debe especificarse el marco de interacción.
- Pretende facilitar la interoperabilidad entre aplicaciones de software y promover la colaboración digital.

## 3 Términos y definiciones
- IDM (manual de entrega de la información): documentación que recoge el proceso de negocio y da especificaciones detalladas de la información que cualquier agente podría necesitar proporcionar en cada momento.
- marco de interacción: descripción formal de los elementos de interacción, incluyendo atribuciones (roles), transacciones, mensajes de la transacción y datos en los mensajes.
- esquema del marco de interacción: descripción formal de las atribuciones con las que han de cumplir los marcos de interacción.
- esquema de interacción: descripción formal de las atribuciones con las que se completan los mensajes enviados y recibidos.
- promotor: algoritmo que genera un esquema de interacción a partir de un marco de interacción, un esquema del marco y un archivo de plantillas.
- archivo de plantillas: archivo con plantillas independientes del marco que permiten generar el esquema de interacción.
- VISI: estándar holandés para la comunicación entre socios en proyectos de construcción; base de esta parte.

## 4 Principios de normalización
**4.2** La metodología de IDM dada en ISO 29481-1 debe utilizarse para todas las referencias al desarrollo y uso de IDM.

**4.3 Componentes del IDM.** Dos perspectivas: requisitos de usuario (mapas de interacción y de procesos, entrega de información, procesos de referencia, calendario del proyecto) y soluciones técnicas (objetos del negocio, especificaciones de información, modelado de la información de edificios). Esta parte se centra en el mapa de interacción.

**4.4 Principios de la comunicación empresarial.** Una vez que un cliente pide un producto o servicio, se pone en marcha una cadena de actividades (proceso de negocio). La comunicación performativa se realiza mediante acciones comunicativas entre dos partes (quien actúa y a quien se dirige la acción). El manejo de una solicitud sigue el patrón de transacción: resultado solicitado (requisito del cliente), resultado prometido (promesa del productor), resultado producido (estado), resultado de la entrega y resultado aceptado (aceptación del cliente).

**4.5 Mapa de interacción.** Debe identificar los tipos de atribuciones (roles) de cada actor y los tipos de transacciones relevantes para un proceso. Distingue entre iniciador (quien pide) y ejecutor (quien da efecto). Una transacción tiene un solo iniciador y un solo ejecutor. Los componentes son: rol tipo Rj, rol compuesto CRj (cuando su composición no es relevante), alcance u objeto de la interacción, transacción tipo Tj, vínculo iniciador y vínculo ejecutor. Todas las transacciones necesarias para gestionar las contribuciones de los roles al BIM deben incluirse, con identidad y nombre únicos. Las interacciones pueden resumirse en una tabla de transacciones.

**4.6 Mensajes en la transacción.** Una transacción contiene un conjunto de mensajes que se intercambian para un propósito, y estipula los roles participantes, el punto del ciclo de vida y la secuencia de entrega. Un mensaje es un modelo de información que puede llevar archivos adjuntos. Un requisito de intercambio puede transferirse como adjunto al ejecutor, y el resultado (contribución al BIM) entregarse al iniciador.

**4.7 Marco de interacción.** Debe incluir: definición de roles; transacciones; mensajes de la transacción; el orden de los mensajes; y los elementos de datos del mensaje. Puede prepararse para un área de aplicación y usarse como estándar internacional, nacional, de organización o de proyecto.

**4.8 Soporte de soluciones software.** Objetivos: edición, integridad y validez, portabilidad, funcionamiento de los sistemas de información e interoperabilidad. Dos niveles: el marco de interacción (que debe cumplir el esquema del marco, en XSD, y registrarse en XML) y la comunicación real (que debe operar sobre la base del marco y del esquema de interacción; cada mensaje debe ser válido según el esquema de interacción). El Promotor genera el esquema de interacción a partir del marco, del esquema del marco y de las plantillas. La implantación técnica (protocolos, servidores, cifrado, SOAP) queda fuera del alcance de la norma.

## 5 Formato de un marco de interacción (tipos del esquema)
- AppendixType: estructura de los metadatos de un archivo o documento adjunto.
- ComplexElementType: colección de SimpleElementType; cada uno aparece el número de veces indicado.
- ElementCondition: describe el comportamiento de los valores de los elementos en mensajes sucesivos (por ejemplo, FIXED: los valores se copian cuando el elemento está disponible y no puede cambiarse).
- GroupType: permite crear varios grupos con contenido específico para agrupar mensajes o documentos dentro de una transacción.
- MessageType: define el contenido de un mensaje, agrupado en ComplexElementType.
- MessageInTransactionType (MITT): relaciona un MessageType con un TransactionType; puede invertir la dirección ejecutor-iniciador y controlar si el flujo se bloquea por transacciones secundarias abiertas.
- OrganisationType, PersonType y ProjectType: definiciones de organizaciones, personas y proyectos y la estructura de sus elementos.
- RoleType: definición de un rol; es requisito previo para crear un TransactionType.
- SimpleElementType: propiedad que puede darse dentro de estructuras de objetos (siempre incrustada en un ComplexElementType).
- TransactionPhaseType: fase en la que se encuentra una transacción (por ejemplo, "resultado solicitado" o "retenido").
- TransactionType: definición de una transacción, con las funciones del iniciador y del ejecutor.
- UserDefinedType: tipos de datos y restricciones XSD (por ejemplo, longitud mínima de una cadena).
- Todos los objetos requieren fecha de inicio y de fin, para limitar su validez.

## Anexo B (normativo) — Definición de plantillas
Archivo de plantillas que contiene reglas independientes de la comunicación real (GroupTemplate, AppendixGroup, AppendixTemplate, MessageTemplate, MessageInTransactionTemplate, TransactionTemplate, TransactionPhaseTemplate, PersonTemplate, OrganisationTemplate, PersonInRole, RoleTemplate, ProjectTypeInstance, ComplexElementTemplate).

## Anexo C (informativo) — Ejemplo de mapa de interacción de una oficina de diseño
- Roles: CR1 Cliente; R1 Jefe de proyecto; R2 Ingeniería de sistemas; R3 Ingeniería 3D; R4 Ingeniería de costes.
- Transacciones: T1 Entrega del diseño (iniciador Cliente, ejecutor Jefe de proyecto); T2 Entrega de la especificación del sistema (Jefe → Ingeniería de sistemas); T3 Entrega del modelo 3D (Jefe → Ingeniería 3D); T4 Cálculo del coste de entrega (Jefe → Ingeniería de costes).
- Ejemplo de la transacción T3 con mensajes: "Solicitud de modelo 3D" (inicia), "Trabajo hecho y solicitud de aprobación", "Solicitar ajustes", "Trabajo aprobado" y "Trabajo no aprobado".

## Anexo D (informativo) — Principios del algoritmo Promotor
El Promotor convierte los elementos "*Type" del marco en elementos complejos XSD, de modo que los MessageType son los elementos primarios para estructurar el contenido de los mensajes. Los identificadores deben ser nombres significativos, no códigos genéricos.
