# 🍀 Sistema de Horários Automáticos - Aurora Bot

## 📝 Comandos Disponíveis

### 1. **!horarios** - Enviar horários manualmente
```
!horarios
```
- Gera horários aleatórios para todas as 22 plataformas
- Baseado na hora atual (São Paulo)
- 7 horários por plataforma
- Funciona imediatamente

### 2. **!horapg** - Ativar/Desativar automático
```
!horapg 1    # Ativar envio automático
!horapg 0    # Desativar envio automático
```

**Exemplo de uso:**
- `!horapg 1` → Liga o sistema automático
- `!horapg 0` → Desliga o sistema automático

### 3. **!addhorapg** - Configurar intervalo
```
!addhorapg 1h      # A cada 1 hora
!addhorapg 30m     # A cada 30 minutos
!addhorapg 2h30m   # A cada 2 horas e 30 minutos
```

**Intervalos aceitos:**
- `30m` = 30 minutos
- `1h` = 1 hora
- `2h` = 2 horas
- `1h30m` = 1 hora e 30 minutos
- Mínimo: 5 minutos

## 🎯 Plataformas Incluídas (22 total)

1. 🐯 FORTUNE TIGER
2. 🐉 DRAGON LUCK
3. 🐰 FORTUNE RABBIT
4. 🐭 FORTUNE MOUSE
5. 🐘 GANESHA GOLD
6. 👙 BIKINI
7. 🥊 MUAY THAI
8. 🎪 CIRCUS
9. 🐂 FORTUNE OX
10. 💰 DOUBLE FORTUNE
11. 🐉🐅 DRAGON TIGER LUCK
12. 🧞 GENIE'S WISHES(GENIO)
13. 🌳🌲 JUNGLE DELIGHT
14. 🐷 PIGGY GOLD
15. 👑 MIDAS FORTUNE
16. 🌞🌛 SUN & MOON
17. 🦹‍♂️ WILD BANDITO
18. 🔥🕊️ PHOENIX RISES
19. 🛒 SUPERMARKET SPREE
20. 🚢👨‍✈️ CAPTAIN BOUNTY
21. 🎃 MISTER HOLLOWEEN
22. 🍀💰 LEPRECHAUN RICHES

## 🚀 Como Configurar

### Passo 1: Ativar o sistema automático
```
!horapg 1
```

### Passo 2: Configurar intervalo (opcional)
```
!addhorapg 1h
```

### Passo 3: Verificar se está funcionando
- O bot enviará automaticamente nos intervalos configurados
- Cada envio terá horários diferentes (geração aleatória)

## 📊 Exemplo de Saída

```
🍀 SUGESTÃO DE HORÁRIOS PAGANTES DAS 14h 💰

*🐯 FORTUNE TIGER*
  └ 14:23 - 14:51
  └ 14:07 - 14:39
  └ 14:15 - 14:44
  └ 14:02 - 14:58
  └ 14:33 - 14:12
  └ 14:47 - 14:26
  └ 14:18 - 14:55

*🐉 DRAGON LUCK*
  └ 14:41 - 14:29
  └ 14:08 - 14:52
  └ 14:34 - 14:17
  └ 14:25 - 14:43
  └ 14:09 - 14:56
  └ 14:31 - 14:14
  └ 14:48 - 14:22

[... continua para todas as 22 plataformas]

Dica: alterne entre os giros entre normal e turbo, se vier um Grande Ganho, PARE e espere a próxima brecha!
🔞NÃO INDICADO PARA MENORES🔞
Lembrando a todos!
Horários de probabilidades aumentam muito sua chance de lucrar, mas lembrando que não anula a chance de perda, por mais que seja baixa jogue com responsabilidade...

Sistema By: Aurora
Creat: Aurora Bot Oficial
```

## ⚙️ Funcionalidades Técnicas

### ✅ **Geração Aleatória**
- Horários são gerados em tempo real
- Baseados na hora atual do sistema
- Cada execução gera horários diferentes
- 7 pares de horários por plataforma

### ✅ **Sistema Automático Inteligente**
- Verifica plano ativo do grupo
- Para automaticamente se plano expirar
- Reinicia automaticamente ao alterar intervalo
- Persiste configurações entre reinicializações

### ✅ **Validações de Segurança**
- Mínimo de 5 minutos entre envios
- Verificação de permissões de administrador
- Validação de formato de intervalo
- Tratamento de erros robusto

### ✅ **Fuso Horário**
- Utiliza timezone "America/Sao_Paulo"
- Horários sempre corretos para o Brasil
- Atualização automática com horário de verão

## 🔧 Status e Controle

### Verificar status atual:
```
!addhorapg
```
Mostra o intervalo atual configurado

### Para desativar completamente:
```
!horapg 0
```

### Para reativar:
```
!horapg 1
```

## 💡 Dicas de Uso

1. **Interval Recomendado**: 1h ou 2h para não spam
2. **Teste Manual**: Use `!horarios` para testar antes de ativar automático
3. **Monitoramento**: O bot logará no console quando enviar automaticamente
4. **Plano Ativo**: Certifique-se de que o grupo tem plano ativo

## 🔄 Reinicialização

Após reiniciar o bot:
- Configurações são mantidas no banco de dados
- Horários automáticos precisam ser reativados manualmente
- Use `!horapg 1` para reativar após reinício

---

**Desenvolvido por Aurora Bot Oficial** 🤖