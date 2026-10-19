# UNE-EN ISO 29481-1:2018 — Modelado de la información de los edificios. Manual de entrega de la información. Parte 1: Metodología y formato (ISO 29481-1:2016)

Texto normativo de referencia (resumen fiel de los requisitos y definiciones). Citar la cláusula exacta (por ejemplo "ISO 29481-1, 5.2.2").

## 0 Introducción
- Un manual de entrega de información (IDM) describe los procesos empresariales y la información requerida por cada actor en un momento concreto del proyecto. Un IDM ayuda a obtener el máximo beneficio de un modelo BIM: si la información requerida está disponible y su calidad es satisfactoria, el proceso mejora mucho.
- Esta parte establece una metodología para elaborar un documento de referencia que describa los procesos y datos requeridos en el desarrollo o gestión de una construcción: cómo identificar y describir los procesos, la información requerida para ejecutarlos y los resultados.

## 1 Objeto y campo de aplicación
- Una metodología que vincula los procesos que tienen lugar durante la construcción de edificios o infraestructuras con la información requerida en esos procesos.
- Una forma de trazar y describir los procesos de información a lo largo del ciclo de vida de las obras.
- Facilita la interoperabilidad entre aplicaciones de software en todas las fases (planificación, diseño, construcción, operación, mantenimiento y demolición).

## 3 Términos y definiciones
- actor: persona, organización o unidad organizativa involucrada en un proceso de construcción.
- BIM (building information modeling): uso de la representación digital y compartida de un objeto construido para facilitar los procesos de diseño, construcción y operación, formando una base confiable para la toma de decisiones.
- aplicación software BIM: software utilizado para crear, modificar, analizar, gestionar, publicar, compartir, finalizar o manipular elementos de un BIM.
- requisito de negocio: requisito que describe en términos de negocio lo que ha de entregarse o realizarse.
- restricción de información: declaración que define o restringe formalmente el alcance de una información por un aspecto del negocio, una regla o una política.
- clase: tipo o colección de elementos que comparten atributos comunes.
- obras de construcción: todo lo que se construye o resulta de los procesos de construcción.
- proceso de construcción: proceso que utiliza medios de construcción para alcanzar resultados de construcción.
- requisito de intercambio (ER, exchange requirement): conjunto definido de unidades de información que han de intercambiarse para satisfacer un requisito de negocio de un proceso en una o varias fases.
- IDM (manual de entrega de información): documentación que recoge el proceso empresarial y da especificaciones detalladas de la información que cualquier agente del proyecto necesitaría proporcionar en un momento particular. Puede denominarse especificación de entrega de información (IDS).
- componentes IDM: mapas de interacción/transacción, mapas de procesos y requisitos de intercambio.
- unidad de información: elemento de información individual (por ejemplo, el identificador de una ventana o la profundidad de una habitación).
- mapa de interacción: representación de los roles y las transacciones relevantes para un propósito determinado.
- marco de interacción: descripción formal de los elementos de interacción (roles, transacciones, mensajes y datos).
- MVD (definición de vista del modelo): definición de un requisito de intercambio interpretable por computadora, vinculado a uno o más esquemas de información estandarizada.
- mapa de procesos (PM): representación de las características relevantes de un proceso asociado a un propósito de negocio.
- rol: funciones que realiza un actor en un periodo de tiempo. Se determina por la acción y el resultado, no necesariamente por la profesión.
- transacción: evento de comunicación que cumple una relación entre dos roles.
- mapa de transacciones: representación de un conjunto de mensajes que se intercambian entre roles para un propósito particular.

## 4 Manual de entrega de información
**4.2 Usuarios.** Desarrolladores de IDM (mapas de interacción, mapas de procesos, requisitos de intercambio y restricciones), usuarios finales y proveedores de soluciones software; y usuarios que emplean los IDM: director de proyecto, BIM Manager, cliente (que incluye el IDM en el contrato), contratista/consultor, gerente de negocios y organizaciones de construcción.

**4.3 Escenario de negocio.** Un cliente contrata a un consultor para entregar un servicio; el IDM describe los requisitos de información asociados a todas las transacciones de esa relación, en ambos sentidos. Parte de la información se desarrolla dentro del BIM y otra puede originarse en cualquiera de las partes o en una fuente externa.

**4.3 Dos metodologías complementarias.** Los mapas de procesos son útiles cuando el foco está en los procesos empresariales (actividades ejecutadas por actores con roles) para entregar un servicio o producto final; la información se asocia a un requisito de negocio. Los mapas de interacción/transacción son útiles cuando el foco está en las interacciones entre actores para asegurar los protocolos de comunicación; la información se asocia a una transacción. Pueden usarse ambos a la vez.

**4.4 Esquema completo y 4.5 vistas.** Un esquema completo de toda la información del proceso de construcción sería grande y no es la forma habitual de entregarla. Se "rompe" en vistas del modelo (MVD) para cumplir cada requisito de intercambio.

**4.6 a 4.8.** Los elementos del esquema general se usan en el modelo de información de construcción: clases, objetos (con identificador y estado) y modelos. Un requisito de intercambio describe, en términos no técnicos, la información que se intercambiará, y su implementación técnica se logra mediante una MVD.

**4.9 Contenido de un IDM específico.** Debe: describir la necesidad de intercambio en el contexto de negocio; identificar a los actores que envían y reciben información; definir, especificar y describir la información intercambiada en cada punto; ser comprensible y útil; crear especificaciones detalladas para el desarrollo de software; y adaptarse a las prácticas de trabajo locales.

## 5 Marco de un IDM
**5.1 Generalidades.** Un IDM comprende (figura 3): un mapa de interacción/transacción y/o un mapa de procesos, y uno o más requisitos de intercambio.
- El mapa de interacción identifica los roles y las transacciones. Para cada transacción, un rol es el iniciador y otro el ejecutor. El mapa de transacciones define los mensajes y las reglas de secuencia.
- El mapa de procesos muestra un canal de actividad para cada rol y la secuencia de actividades de ese rol. Las relaciones entre actividades de diferentes roles corresponden a mensajes de transacciones.
- Los mensajes pueden llevar un paquete de información BIM, lo que exige un requisito de intercambio. La implementación técnica del requisito se logra con una MVD; la de un mapa de interacción/transacción, con un marco de interacción.

**5.2 Marco básico.**
- 5.2.2 Cada componente debe incluir como mínimo: nombre o título conforme a la tabla 1; identificador único; fase del proyecto que apoya; registro de cambios (creación y cambios, con autor y fecha).
- Tabla 1 (reglas de denominación): 1) todo componente tiene nombre; 2) prefijos: er_ (requisito de intercambio), im_ (mapa de interacción), pm_ (mapa de procesos), tm_ (mapa de transacción); 3) el nombre es un imperativo: un verbo (acción) seguido de un sustantivo (objeto); 4) las palabras se separan con guion bajo "_"; 5) los parámetros se expresan entre paréntesis, por ejemplo (a, b, c, d).
- 5.2.3 Cada componente debe comenzar con una descripción en lenguaje sencillo del contenido, caso de uso, objetivos y alcance.

**5.3 Mapa de interacción/transacción.** Identifica los roles y transacciones relevantes para un propósito específico (generalmente, completar una tarea del equipo). Distingue entre el rol que solicita (iniciador) y el que ejecuta (ejecutor). Se recomienda el enfoque CRISP. Todas las transacciones necesarias deben incluirse, con identidad y nombre únicos. El mapa de transacciones se representa con UML (diagrama de secuencia) e incluye mensajes, reglas de secuencia y, en transacciones específicas, adjuntos: requisito de intercambio, paquete de información y ventana de autorización (lo que el rol ejecutor puede leer o modificar).

**5.4 Mapa de procesos.** Describe el flujo de actividades dentro de los límites de un proceso empresarial, los roles y la información requerida, consumida y producida. Se recomienda BPMN (anexo D). Debe establecer el límite del proceso, las actividades y la secuencia lógica. La información dentro del proceso se determina por los requisitos de intercambio especificados en él.

**5.5 Requisitos de intercambio.** Define la información que debe intercambiarse para respaldar un proceso empresarial en una fase concreta, en términos comprensibles para los usuarios finales. Representa la conexión entre proceso y datos. Se compone de:
- Unidades de información: cada una trata con un tipo de información o concepto. Debe especificarse la descripción (explícita e inequívoca) y la información que debe intercambiarse, con disposiciones especiales o reglas. Las condiciones previas se identifican primero.
- Restricciones de información: especifican el tipo de datos (texto, entero, número, gráfico 2D, modelo 3D) y las reglas de uso (por ejemplo, una mesa debe tener al menos tres patas; la superficie de una habitación no puede ser negativa; el tamaño máximo de un panel debería permitir su transporte).

**5.6 Implementación técnica.** Un requisito de intercambio se implementa mediante una definición de vista del modelo (MVD), que define un modelo de datos o un subconjunto necesario para soportar uno o más requisitos. Las MVD se usan en el desarrollo de software y deben representarse en formato legible por máquina. Un marco de interacción es la descripción formal de los roles, transacciones, mensajes y datos (ver ISO 29481-2).

## Anexo A (informativo) — Proceso de desarrollo de un IDM
- A.1 Proponer el desarrollo: definir el alcance (necesidades de negocio, actores, cómo se gestionará el intercambio, si los acuerdos y estándares lo respaldan); establecer el enfoque; identificar recursos (gestión del proyecto, desarrollo de componentes, conocimiento del sector); y el plan del proyecto.
- A.2 Enfoques: (a) descubrimiento del proceso (convencional: mapeo de procesos o de interacciones con expertos, con varios ciclos); (b) personalización de restricciones de información sobre un requisito existente, por localización; (c) ingeniería inversa de software existente, definiendo escenarios y los datos que requieren las aplicaciones.
- A.2.5 Implantación: validar el intercambio antes del envío y en la recepción. Para certificar software, las aplicaciones deben demostrar su capacidad de exportar/importar según los requisitos.

## Anexo B (informativo) — Ejemplos simplificados
Ejemplo de un cliente que contrata un equipo de consultores para diseñar las instalaciones de un edificio: mapa de procesos (pm_29481_sample), mapa de interacción (im_29481_sample), mapa de transacción (tm_29481_sample) y requisito de intercambio (er_29481_sample) con unidades de información de un cuadro delimitador 3D (identificador, largo, ancho, alto, ubicación) y formato XML.

## Anexo C (informativo) — Fases de referencia del ciclo de vida (ISO 22263)
Fases normalizadas: 0 Requisitos del expediente; 1 Concepto de necesidad; 2 Descripción general de la viabilidad; 3 Viabilidad del anteproyecto; 4 Describir el diseño conceptual; 5 Diseño conceptual completo; 6 Diseño coordinado (y suministro); 7 Producción de la información; 8 Construcción; 9 Operación y mantenimiento; 10 Eliminación. Las fases locales pueden personalizarse manteniendo la correspondencia 1:1, 1:muchos o muchos:1 con las normalizadas, sin cruzar sus límites.

## Anexo D (informativo) — Uso de BPMN para el IDM
- Símbolos recomendados: inicio, intermedio, fin; eventos de mensaje, enlace y referencia; pasarelas (exclusiva, paralela, inclusiva); actividades; subprocesos (contraído/extendido); conjunto y banda; flujo de secuencia; flujo de mensaje; asociación; objeto de datos; grupo; anotación de texto.
- Reglas: el flujo de procesos está contenido en el conjunto; un flujo de mensajes conecta dos conjuntos distintos; un requisito de intercambio se representa como objeto de datos con un nombre que respete las reglas de denominación.
