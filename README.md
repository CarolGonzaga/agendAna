# 🌙 AgendAna — Agenda Gamificada Pessoal (PWA)

Uma aplicação web progressiva (PWA) completa, funcional e gamificada, desenhada especificamente para uma experiência acolhedora, sem sobrecarga visual e amigável para TDAH e ansiedade.

---

## ✨ Funcionalidades Principais

- **Visualização Foco ("Agora" & "Depois")**: Reduz a ansiedade mostrando apenas o compromisso atual e o próximo, com tempo restante e conclusão rápida.
- **Gamificação Dual (Pontos vs XP)**:
  - **Pontos**: Moeda gastável em recompensas e mimos cadastrados.
  - **XP**: Acumulado contínuo para evolução nos 8 níveis do Grimório (sem nunca diminuir).
- **8 Níveis de Evolução**:
  1. *Desperta* (0 XP)
  2. *Aprendiz da Lua* (100 XP)
  3. *Guardiã do Grimório* (250 XP)
  4. *Bruxa da Névoa* (450 XP)
  5. *Vampira do Crepúsculo* (700 XP)
  6. *Feiticeira da Noite* (1000 XP)
  7. *Mestra da Lua* (1400 XP)
  8. *Lenda da Meia-Noite* (1900 XP)
- **Recompensas & Encaixe em Horários Livres**: Resgate seus pontos por agrados e encaixe-os automaticamente nos blocos livres da rotina.
- **Linguagem Acolhedora**: Eventos não concluídos são marcados suavemente como *"Encerrado"*, sem mensagens de culpa.
- **PWA & Web Push**: Suporte para instalação na Tela de Início (iOS/Android/Desktop), service worker offline, notificações Web Push e sintetizador de som suave celestial (Web Audio API).
- **Backend Supabase**:
  - Row Level Security (RLS) em 100% das tabelas (`auth.uid() = user_id`).
  - Realtime para sincronização instantânea entre múltiplos dispositivos.
  - Storage bucket para fotos de perfil personalizadas.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Date-fns, Framer Motion, Radix UI.
- **Backend & Auth**: Supabase Database (PostgreSQL), Supabase Auth, Supabase Storage, Supabase Realtime.
- **PWA**: Web App Manifest, Service Worker, Web Push API, Web Audio API.

---

## 🚀 Como Executar

### 1. Clonar e Instalar Dependências

```bash
git clone https://github.com/CarolGonzaga/agendAna.git
cd agendAna
npm install
```

### 2. Configurar o Banco de Dados no Supabase

1. Abra o **SQL Editor** no painel do seu projeto Supabase.
2. Execute o conteúdo de [`supabase/setup_complete.sql`](supabase/setup_complete.sql) para criar as tabelas, políticas RLS, buckets de storage e os dados iniciais da rotina.

### 3. Rodar Localmente

```bash
npm run dev
```

Abra [http://localhost:5173](http://localhost:5173) no seu navegador.

### 4. Build de Produção

```bash
npm run build
```

---

## 📜 Licença

Projeto desenvolvido para uso pessoal. Todos os direitos reservados.
