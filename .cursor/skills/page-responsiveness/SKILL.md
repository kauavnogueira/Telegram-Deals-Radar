---
name: page-responsiveness
description: >-
  Audita e implementa responsividade fluida (mobile-first, tablet e desktop)
  em telas e componentes Next.js/Tailwind CSS v4. Prioriza usabilidade touch
  (alvos >=44px), prevenção de overflow horizontal, grids flexíveis e
  comportamento de bottom sheet/drawer em telas estreitas (<768px).
---

# page-responsiveness

Skill de responsividade e usabilidade mobile/tablet para a stack do projeto:
**Next.js 16 (App Router) + React 19 + Tailwind CSS v4 + Lucide React**.

## Como Invocar

Digite no chat:
```
/page-responsiveness <tela | rota | componente>
```
Exemplo:
```
/page-responsiveness src/components/DashboardHeader.tsx
/page-responsiveness arrumar a tabela no celular
```

---

## Workflow Obrigatório

### 1. Diagnóstico do Alvo
Antes de editar o código, mapear no chat em formato sucinto:
1. **Componente/Tela Alvo**: caminho do arquivo (ex.: `src/app/page.tsx`, `src/components/DashboardHeader.tsx`).
2. **Breakpoints Críticos**:
   - Mobile estreito: `360px – 480px`
   - Mobile padrão / Tablet portrait: `640px – 768px` (`sm` a `md`)
   - Tablet landscape / Desktop compacto: `768px – 1024px` (`md` a `lg`)
   - Desktop: `>1024px` (`lg` / `xl` / `2xl`)
3. **Falhas Identificadas**: overflow horizontal, alvos de toque < 44px, grids quebrados, menus que somem sem alternativa.
4. **Plano de Mudança**: classes Tailwind específicas e padrões a aplicar.

---

## Regras Técnicas do Projeto (Next.js 16 + Tailwind v4)

### A. Viewport & Scroll
- **Sem overflow horizontal**: Nunca usar larguras fixas em pixels (`w-[600px]`). Usar `w-full max-w-X`.
- **Altura dinâmica mobile**: Usar `h-dvh` ou `min-h-dvh` (Dynamic Viewport Height) em vez de `h-screen` ou `100vh` para evitar saltos com a barra de endereços do navegador mobile.
- **Truncamento seguro**: Textos longos em cards ou cabeçalhos devem usar `truncate` ou `line-clamp-2` associados a `min-w-0`.

### B. Touch Targets (Dedo / Ergonomia Mobile)
- Botões, abas, ícones interativos e inputs devem ter área de clique mínima de **44 × 44px**:
  - Exemplo com ícone: `p-2.5 sm:p-2 min-h-[44px] min-w-[44px] flex items-center justify-center`.
  - Espaçamento entre alvos próximos: no mínimo `gap-2` (8px).

### C. Padrões por Componente

#### 1. Header & Barras de Ação (`DashboardHeader`)
- Mobile (<640px): Ações secundárias agrupadas em menu dropdown/drawer (hamburger/três pontos).
- NUNCA esconder ações de gerenciamento primárias sem mantê-las acessíveis no menu mobile.
- Logo: texto encurtado (`sm:inline hidden` para texto longo).
- Abas e filtros: rolagem horizontal sem scrollbar feia (`overflow-x-auto scrollbar-none flex-nowrap`).

#### 2. Barra Lateral / Filtros (`ProductSidebar`)
- Desktop (`>=lg`): Sidebar estática/sticky na lateral (`w-72 shrink-0`).
- Mobile/Tablet (`<lg`): Slide-over drawer lateral ou bottom-sheet acionado por botão flutuante ou botão fixo no topo com indicador de filtros ativos.

#### 3. Cards & Grids (`ProductCard`, `CouponCard`, listagens)
- Escala de colunas fluida:
  ```tsx
  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4"
  ```
- Imagens de produtos: manter aspect ratio previsível (`aspect-[4/3]` ou `aspect-square`) com `object-contain` ou `object-cover`.
- Ações no card: botões em largura total no mobile (`w-full sm:w-auto`).

#### 4. Modais e Diálogos (`*Modal.tsx`)
- Desktop: Modal centralizado `max-w-lg w-full`.
- Mobile: Bottom-sheet fixado na base com cantos superiores arredondados (`max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:rounded-b-none max-sm:max-h-[90dvh] overflow-y-auto`).

#### 5. Métricas e Resumos (`StatsOverview`)
- Mobile: Grid 2x2 (`grid grid-cols-2 sm:grid-cols-4 gap-2`) ou carrossel horizontal snap (`flex overflow-x-auto snap-x`).

---

## Anti-Patterns (O que NUNCA fazer)
- ❌ Usar `hidden` em ações essenciais sem prover alternativa de acesso mobile.
- ❌ `overflow-hidden` no `body` que quebre o scroll nativo.
- ❌ Textos ilegíveis (<12px) em mobile; preferir `text-xs` (12px) como piso absoluto e `text-sm` (14px) para leitura.
- ❌ Tabelas largas sem wrapper com scroll horizontal (`overflow-x-auto -mx-4 px-4`).
- ❌ Adicionar bibliotecas CSS pesadas quando Tailwind v4 nativo resolve.

---

## Verificação Pós-Edição
Toda implementação via esta skill deve ser validada nos seguintes viewports:
1. `375 x 667` (iPhone SE / mobile estreito)
2. `390 x 844` (iPhone 12/13/14)
3. `768 x 1024` (iPad Mini / Tablet portrait)
4. `1280 x 800` (Laptop / Desktop)
