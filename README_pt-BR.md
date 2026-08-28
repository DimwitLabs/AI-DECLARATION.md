# AI-DECLARATION.md

[![AI-DECLARATION: copilot](https://img.shields.io/badge/䷼%20AI--DECLARATION-copilot-fee2e2?labelColor=fee2e2)](https://ai-declaration.md)
[![Dimwit Pledge](https://dimwit.me/pledge.svg)](https://dimwit.me/pledge)

## Resumo
O código gerado por IA é uma realidade do nosso tempo e é tanto uma bênção quanto uma maldição. O problema não é o código em si, mas a transparência e a clareza. Pelo menos, essa é a teoria de trabalho desta especificação. A sugestão é simples: convidar todos a incluírem um arquivo `AI-DECLARATION.md` estruturado, assim como incluem outros arquivos em um repositório, para deixar claro o uso de IA _e_, o mais importante, para que isso se torne uma convenção amplamente adotada.

Isso não tem o objetivo de desencorajar o uso de LLMs e outras gerações de código no futuro. Pelo contrário, é um facilitador. Quando você declara quais partes do código foram, de fato, geradas, um cético pode imediatamente examinar apenas essas partes para satisfazer seu impulso de verificar e checar novamente. E, isso permite que o criador mostre suas habilidades com código, planejamento e outras habilidades interpessoais simultaneamente e com clareza.

### Especificação

Um arquivo `AI-DECLARATION.md` usa frontmatter YAML para campos estruturados, seguido por uma seção `## Notes` obrigatória no corpo do markdown para contexto humano. Os requisitos mínimos do arquivo são `version`, `level` e uma seção `## Notes`.

Opcionalmente, você pode declarar `processes`, cada um com seu próprio nível. O `level` global deve ser o nível mais alto presente. Qualquer processo não listado é implicitamente considerado como `none`. Você também pode listar `components` (caminhos de arquivos ou diretórios) com níveis individuais.

A especificação define formalmente `version`, `level`, `processes` e `components`.

#### Níveis

Os níveis visam abranger não apenas a geração de código, mas também atividades relacionadas, como revisão de código. Eles são definidos como uma combinação dos verbos `act` e `prompt` juntamente com entidades como `Human`, `AI` e `task`.

- `none`: O humano age sozinho na tarefa, sem envolvimento de IA.
- `hint`: O humano age na tarefa e a IA oferece sugestões passivamente.
- `assist`: O humano faz o prompt e a IA age em uma parte da tarefa.
- `pair`: O humano faz o prompt e tanto o humano quanto a IA agem igualmente na tarefa; o humano entende claramente os detalhes internos.
- `copilot`: O humano faz o prompt e a IA age em toda a tarefa, solicitando permissão ou esclarecimento ao Humano.
- `auto`: O humano faz o prompt e a IA age de forma autônoma, levando a tarefa à conclusão.

#### Processos

- `design`: Arquitetura, design de sistema e tomada de decisão.
- `implementation`: Escrita de código de produção.
- `testing`: Escrita de testes, planos de teste e garantia de qualidade.
- `documentation`: Escrita de documentação, comentários, READMEs e changelogs.
- `review`: Revisão de código e feedback em pull requests.
- `deployment`: Configuração de CI/CD, infraestrutura e scripts de release.

### Esquema

O seguinte esquema YAML define formalmente a estrutura de um arquivo `AI-DECLARATION.md`. Use-o para validar declarações ou construir ferramentas.

```yaml
type: object
required: [version, level]
definitions:
  level:
    type: string
    enum: [none, hint, assist, pair, copilot, auto]
properties:
  version:
    type: string
    pattern: "^[0-9]+\\.[0-9]+\\.[0-9]+$"
  level:
    $ref: "#/definitions/level"
  processes:
    type: object
    propertyNames:
      enum: [design, implementation, testing, documentation, review, deployment]
    additionalProperties:
      $ref: "#/definitions/level"
  components:
    type: object
    additionalProperties:
      $ref: "#/definitions/level"
additionalProperties: false
```

### Exemplos

Abaixo, você encontrará alguns exemplos de diferentes cenários.

#### Simples

O `AI-DECLARATION.md` mais simples requer `version`, `level` e uma seção `## Notes`.

```markdown
---
version: "0.1.1"
level: none
---

This format is based on [AI-DECLARATION.md](https://ai-declaration.md/en/0.1.1).

## Notas

- - No AI tools were used..
```

```markdown
---
version: "0.1.1"
level: auto
---

This format is based on [AI-DECLARATION.md](https://ai-declaration.md/en/0.1.1).

## Notas

- Claude Code was used to create the whole application.
```

#### Com Processos

Use `processes` para declarar granularmente o envolvimento de IA por fase de desenvolvimento. O `level` global deve ser o nível mais alto presente. Qualquer processo não listado é implicitamente considerado como `none`.


```markdown
---
version: "0.1.1"
level: auto
processes:
  design: auto
  testing: copilot
---

This format is based on [AI-DECLARATION.md](https://ai-declaration.md/en/0.1.1).

## Notas

- AI drove architecture decisions and test generation. All output was reviewed by a human.
```

#### Com Componentes

Use `components` para declarar o envolvimento de IA para arquivos ou diretórios específicos.

```markdown
---
version: "0.1.1"
level: auto
components:
  src/helpers: auto
---

This format is based on [AI-DECLARATION.md](https://ai-declaration.md/en/0.1.1).

## Notas

- The helpers directory was fully generated. All other code is human-written.
```

## Badges

Adicione uma badge ao seu `README` para declarar o nível do seu `AI-DECLARATION` de relance. Observe que isso é apenas por conveniência, pois para estar em conformidade com a especificação, você _deve_ incluir um arquivo `AI-DECLARATION.md`.

- [![AI-DECLARATION: none](https://img.shields.io/badge/䷼%20AI--DECLARATION-none-dcfce7?labelColor=dcfce7)](https://ai-declaration.md)
- [![AI-DECLARATION: hint](https://img.shields.io/badge/䷼%20AI--DECLARATION-hint-ecfccb?labelColor=ecfccb)](https://ai-declaration.md)
- [![AI-DECLARATION: assist](https://img.shields.io/badge/䷼%20AI--DECLARATION-assist-fef9c3?labelColor=fef9c3)](https://ai-declaration.md)
- [![AI-DECLARATION: pair](https://img.shields.io/badge/䷼%20AI--DECLARATION-pair-ffedd5?labelColor=ffedd5)](https://ai-declaration.md)
- [![AI-DECLARATION: copilot](https://img.shields.io/badge/䷼%20AI--DECLARATION-copilot-fee2e2?labelColor=fee2e2)](https://ai-declaration.md)
- [![AI-DECLARATION: auto](https://img.shields.io/badge/䷼%20AI--DECLARATION-auto-ede9fe?labelColor=ede9fe)](https://ai-declaration.md)

## FAQ

### E se eu mentir?
Bem, isso anula completamente o propósito, não é? A ideia é que todos tenhamos um contrato social em que possamos confiar. Se você vir um repositório com um `AI-DECLARATION.md` nele, pode usá-lo como uma única fonte de verdade.

### Posso construir ferramentas para gerar isso automaticamente?
Fique à vontade. Eu vislumbro ferramentas para construí-lo automaticamente, bem como para analisá-lo. Embora eu vá fazê-lo em algum momento, agradeço toda e qualquer contribuição.

### Posso contribuir com uma tradução?
Com certeza! Por favor. Basta fazer um fork do repositório e adicionar um `README_<locale>.md`, por exemplo, `README_es.md`. Em seguida, abra um PR. Eu cuidarei do resto.

### Posso sugerir uma mudança na especificação?
Sim, a iniciativa open-source é para isso. Eu vejo a especificação evoluindo naturalmente com feedback e PRs. Então, vamos nos falando.

### Preciso incluir o arquivo se adicionei uma badge ao meu README?
Sim, a recomendação é incluir um `AI-DECLARATION.md` como a fonte primária de verdade. A badge no `README` é apenas uma forma rápida de alguém verificar que A, o `AI-DECLARATION.md` estaria disponível e B, o nível.

### O que é este logotipo?
䷼ O Hexagrama 61 ou Hexagrama da Verdade Interior (Unicode: `U+4DFC`) é um dos 64 hexagramas do Yi (I) Ching para ilustrar princípios onde cada linha é Yin (quebrada) ou Yang (sólida). ([source](https://en.wikipedia.org/wiki/List_of_hexagrams_of_the_I_Ching#Hexagram_61))

## Recursos
- [yujqiao/ai-declare](https://github.com/yujqiao/ai-declare) agent skill para gerar `AI-DECLARATION.md`
- [DimwitLabs/ai-declare](https://github.com/DimwitLabs/ai-declare) fork do anterior que lê a especificação e valida pela [API](https://ai-declaration.md/api/)
- [ai-declaration Reddit bot](https://developers.reddit.com/apps/ai-declaration/) bot oficial que detecta um repositório GitHub vinculado e comenta o que ele declara, pela [API](https://ai-declaration.md/api/)
