# Mapa de Bairros de Porto Ferreira

- Utilizado dados públicos do IBGE
- Realizado tratamento de nomes de alguns bairros
- Realizado clusterização por nome do bairro

Obs.: Itens referentes ao processo de importação dos dados originais para o Postgres, tratamento, clusterização e geração do arquivo GeoJSON não estão incluídos nesse repositório.

Para ver o script de processamento e clusterização dos dados, acesse [esse repositório](https://github.com/arielfavaro/bairros-porto-ferreira-scripts)

## Anotações de consultas SQL (Postgres)
```sql
CREATE OR REPLACE VIEW vw_bairros_porto_ferreira AS
-- 1) Identifica clusters por bairro
WITH clusters AS (
  SELECT
    id,
    localidade,
    geometria,
    ST_ClusterDBSCAN(
      ST_Transform(geometria,3857), -- reprojetar de 4326 -> UTM(m)
      eps       := 500, -- 500 m
      minpoints := 15 -- cluster mínimo de 15 pontos
    ) OVER (PARTITION BY localidade) AS cluster_id
  FROM poligonos_ibge_cnefe
  WHERE "codigoMunicipio" = '3540705'
  AND ativo = true
),
good_clusters AS (
  SELECT localidade, cluster_id
  FROM clusters
  WHERE cluster_id IS NOT NULL
  GROUP BY localidade, cluster_id
  HAVING COUNT(*) >= 10 -- só clusters com ≥10 pontos
),

-- 2) Calcula o casco de cada cluster em UTM e transforma de volta a 4326
cluster_hulls AS (
  SELECT
    c.localidade,
    c.cluster_id,
    ST_Transform(
      ST_Concavehull(                       -- ou ST_ConcaveHull(...,0.95)
        ST_Collect(
          ST_Transform(c.geometria,3857)
        ),
        0.99 -- quanto mais próximo de 1, mais parecido com o convex hull
      ),
      4326
    ) AS geom
  FROM clusters c
  JOIN good_clusters gc
    ON c.localidade = gc.localidade
   AND c.cluster_id = gc.cluster_id
  GROUP BY c.localidade, c.cluster_id
)

-- 3a) Se quiser uma geometria por ilha (cada linha = um pedaço):
-- SELECT
--   localidade,
--   cluster_id,
--   ST_AsText( ST_Multi(geom) ) AS bairro_geom
-- FROM cluster_hulls
-- ORDER BY localidade, cluster_id;

-- 3b) Se preferir um único MULTIPOLYGON por localidade, reunindo as ilhas:
SELECT
  localidade,
  -- ST_AsText(
    ST_Multi(
      ST_Collect(geom)
    )
  -- )
  AS bairro_geom
FROM cluster_hulls
GROUP BY localidade;
```
