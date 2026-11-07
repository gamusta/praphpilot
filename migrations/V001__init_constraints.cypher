// Unicité des composants
CREATE CONSTRAINT component_ref IF NOT EXISTS
FOR (c:Component) REQUIRE c.ref IS UNIQUE;

// Clés de MERGE utilisées par GraphRepository
CREATE CONSTRAINT service_name IF NOT EXISTS
FOR (s:Service) REQUIRE s.name IS UNIQUE;

CREATE CONSTRAINT event_name IF NOT EXISTS
FOR (e:Event) REQUIRE e.name IS UNIQUE;
