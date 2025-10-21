const $BigInteger = Java.loadClass("java.math.BigInteger")
const $RecipeHelper = Java.loadClass("com.gregtechceu.gtceu.api.recipe.RecipeHelper")
const $FormattingUtil = Java.loadClass("com.gregtechceu.gtceu.utils.FormattingUtil")
const $GTCapabilityHelper = Java.loadClass("com.gregtechceu.gtceu.api.capability.GTCapabilityHelper")
const $ClipContext = Java.loadClass("net.minecraft.world.level.ClipContext")

const TIME_TWISTER_COOLDOWN = 20
const TIME_TWISTER_MAX_TIME = 80

function setMessageTt(player, count){
  player.setStatusMessage((player.getEffect("minecraft:luck") ? "⚡可使用次数：" : "可使用次数：")  + count)
}

function consume(player, hand, simulate) {
  let tt = player.persistentData.getInt("tt_count")
  if (simulate) {
    return tt > 0
  }

  //if(player.getName().getString().equals("Huyil") && tt===1){
  if(tt===1){
    player.setStatusMessage("Huyil最棒了!!")
    return true
  }
  
  player.persistentData.putInt("tt_count", (tt - 1))
  if (tt > 0) {
    setMessageTt(player,tt - 1)
    return true
  }else {
    player.addItemCooldown(player.getHeldItem(hand), TIME_TWISTER_COOLDOWN)
    return false
  }
}

function consumeBatteryItem(item, cost) {
  if(!item.nbt) {
    return false
  }
  let charge = item.nbt.Charge
  let count = item.count
  if (!charge || charge * count < cost) {
    return false
  }

  item.nbt.Charge = charge - (cost + count - 1) / count
  return true
}

// 电池消耗逻辑，查找背包第一个gtceu:battery并扣除charge
function consumeBattery(player, chargeCost) {
  if (!player.inventory) {
    return false
  }

  let batteryFound = false

  let lastBattery = player.persistentData.getInt("lastBatterySlotId")

  if (lastBattery >= 0 && lastBattery < player.inventory.slots) {
    let item = player.inventory.getStackInSlot(lastBattery)
    if (item && item.hasTag("gtceu:batteries")) {
      batteryFound = true
      if (consumeBatteryItem(item, chargeCost)) {
        player.inventory.setStackInSlot(lastBattery, item);
        return true
      }
    }
  }

  for (let i = 0; i < player.inventory.slots; i++) {
    let item = player.inventory.getStackInSlot(i)
    if (item && item.hasTag("gtceu:batteries")) {
      batteryFound = true
      if (consumeBatteryItem(item, chargeCost)) {
        player.persistentData.putInt("lastBatterySlotId", i);
        player.inventory.setStackInSlot(i, item);
        return true
      }
    }
  }

  if (!batteryFound) {
    player.setStatusMessage("未找到电池,收到雷击或许有奇效?")
  } else {
    player.setStatusMessage("电池电量不足，需要" + chargeCost + "EU")
  }

  return false
}

function getEyePositionPos(level, player) {
  return level.clip(new $ClipContext(player.getEyePosition(1), player.getEyePosition(1).add(player.getViewVector(1).scale(5)), $ClipContext.Block.OUTLINE, $ClipContext.Fluid.NONE, player)).getBlockPos()
}

function getEyePositionRecipeLogic(level, player) {
  return $GTCapabilityHelper.getRecipeLogic(level, getEyePositionPos(level, player), null)
}

PlayerEvents.tick(event => {
  if (event.player.age % TIME_TWISTER_COOLDOWN == 0) {
    let tt = event.player.persistentData.getInt("tt_count")
    let tti = event.player.getHeldItem("main_hand") == "kubejs:time_twister"
    if (tt > TIME_TWISTER_MAX_TIME) {
      if (tti) {
        //setMessageTt(event.player,TIME_TWISTER_MAX_TIME)
      }
    } else {
      event.player.persistentData.putInt("tt_count", tt + 1)
      if (tti) {
        setMessageTt(event.player,(tt + 1))
      }
    }
  }
})

ItemEvents.rightClicked("kubejs:time_twister", event => {
  if (!event.player.isFake() && event.player.isSteppingCarefully()) {
    var recipeLogic = getEyePositionRecipeLogic(event.level, event.player)
    if (recipeLogic != null && recipeLogic.isWorking()) {
      if (event.player.isCreative()) {
        recipeLogic.setProgress(recipeLogic.getDuration() + 1)
      } else {
        if ($RecipeHelper.getInputEUt(recipeLogic.getLastRecipe()) > 0) {
          let reducedDuration = recipeLogic.getDuration() / 4

          if (reducedDuration < 40) {
            reducedDuration = 40
          }

          if (!consume(event.player, event.hand, true)) {
            return
          }
          
          if (recipeLogic.getMachine().self().getTier() <= 2) {
            consume(event.player, event.hand, false)
            recipeLogic.setProgress(recipeLogic.getProgress() + reducedDuration)
            return
          }
          
          if(event.player.getEffect("minecraft:luck"))
          {
            consume(event.player, event.hand, false)
            recipeLogic.setProgress(recipeLogic.getProgress() + reducedDuration)
          }else{
            let eu = (reducedDuration * $RecipeHelper.getInputEUt(recipeLogic.getLastRecipe()) + 4 ) / 5
            if (eu > 0 && consumeBattery(event.player, eu)) {
              consume(event.player, event.hand, false)
              recipeLogic.setProgress(recipeLogic.getProgress() + reducedDuration)
            }
          }
        }
      }
    }
  }
})


// 玩家冷却记录
const lightningCooldowns = {};

EntityEvents.hurt(event => {
    const { source, entity } = event;
    if (!entity.isPlayer()) return;

    const playerName = entity.getName().getString();
    const now = Date.now();
  
    // 冷却 2 秒判断
    if (lightningCooldowns[playerName] && now - lightningCooldowns[playerName] <= 2000) {
        // 冷却期间免疫伤害
        event.cancel(); // 取消伤害
        return;
    }
    // 非雷击直接返回
    if (source.getType() !== 'lightningBolt') return;
    if (entity.getMainHandItem().id !== 'kubejs:time_twister') return;

    // 更新冷却时间
    lightningCooldowns[playerName] = now;

    let current = entity.getEffect("minecraft:luck")
    let extra = 12000  // 每次雷击 +2 分钟
    if (current != null) {
      let newDuration = current.getDuration() + extra
      entity.potionEffects.add('minecraft:luck', newDuration, 0, false, false)
    } else {
      entity.potionEffects.add('minecraft:luck', extra, 0, false, false)
    }
    entity.setStatusMessage("§e⚡时间瓶⚡似乎产生了一些变化")
  event.cancel(); // 取消伤害
});

PlayerEvents.chat(event => {
  let player = event.player
  let message = event.message.toLowerCase()  // 转小写方便匹配

  // 判断玩家主手物品是否是 time_twister
  let mainHand = player.getMainHandItem()
  if (mainHand.id != "kubejs:time_twister") return

  // 检测关键词
  let keywords = ["皮卡","没电", "充电", "电池", "来电", "闪电", "雷公助我", "天命", "皮卡丘", "十万伏特", "雷电法王", "杨永信","雷神","雷电将军","雷军","su7","yu7","ciallo","⚡"]
  let containsKeyword = keywords.some(word => message.includes(word))
  if (!containsKeyword) return

  // 召唤闪电
  // 延迟 1 tick 执行
  player.server.schedule(1, () => {
    player.server.runCommandSilent(`ftbquests change_progress ${player.getName().getString()} complete 228ED94425D7AB3C`)
  })
})