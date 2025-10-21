const $BigInteger = Java.loadClass("java.math.BigInteger")
const $RecipeHelper = Java.loadClass("com.gregtechceu.gtceu.api.recipe.RecipeHelper")
const $FormattingUtil = Java.loadClass("com.gregtechceu.gtceu.utils.FormattingUtil")
const $GTCapabilityHelper = Java.loadClass("com.gregtechceu.gtceu.api.capability.GTCapabilityHelper")
const $ClipContext = Java.loadClass("net.minecraft.world.level.ClipContext")

const TIME_TWISTER_COOLDOWN = 20
const TIME_TWISTER_MAX_TIME = 40

function consume(player, hand, simulate) {
  let tt = player.persistentData.getInt("tt_count")
  if (simulate) {
    return tt > 0
  }
  player.persistentData.putInt("tt_count", tt - 1)
  if (tt > 0) {
    player.setStatusMessage("可使用次数：" + (tt - 1))
    return true
  } else {
    player.addItemCooldown(player.getHeldItem(hand), TIME_TWISTER_COOLDOWN)
    return false
  }
}

function consumeBatteryItem(item, cost) {
  let charge = item.nbt.Charge
  if (!charge || charge < cost) {
    return false
  }

  item.nbt.Charge = charge - cost
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
    player.setStatusMessage("未找到电池")
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
        event.player.setStatusMessage("可使用次数：" + TIME_TWISTER_MAX_TIME)
      }
    } else {
      event.player.persistentData.putInt("tt_count", tt + 1)
      if (tti) {
        event.player.setStatusMessage("可使用次数：" + (tt + 1))
      }
    }
  }
})

ItemEvents.rightClicked("kubejs:time_twister", event => {
  if (!event.player.isFake() && event.player.isSteppingCarefully()) {
    var recipeLogic = getEyePositionRecipeLogic(event.level, event.player)
    if (recipeLogic != null && recipeLogic.isWorking()) {
      if (event.player.isCreative()) {
        recipeLogic.setProgress(recipeLogic.getDuration() - recipeLogic.getProgress() - 20)
      } else {
        if ($RecipeHelper.getInputEUt(recipeLogic.getLastRecipe()) > 0) {
          let reducedDuration = 10
          if (recipeLogic.getDuration() > 400) {
            reducedDuration = 40
          } else if (recipeLogic.getDuration() > 200) {
            reducedDuration = 20
          }

          if (!consume(event.player, event.hand, true)) {
            return
          }

          if (recipeLogic.getMachine().self().getTier() <= 2) {
            consume(event.player, event.hand, false)
            recipeLogic.setProgress(recipeLogic.getProgress() + reducedDuration)
            return
          }

          let eu = reducedDuration * $RecipeHelper.getInputEUt(recipeLogic.getLastRecipe())
          if (eu > 0 && consumeBattery(event.player, eu)) {
            consume(event.player, event.hand, false)
            recipeLogic.setProgress(recipeLogic.getProgress() + reducedDuration)
          }
        }
      }
    }
  }
})