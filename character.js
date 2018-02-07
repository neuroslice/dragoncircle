module.exports = {
  createFull: function (name, lvl, cclass, race, backg, align, str, dex, con, int, wis, cha,
                    strmod, dexmod, conmod, intmod, wismod, chamod, AC, init, spd, hpdice,
                    hpmax, hpcurr, profic, strsave, dexsave, consave, intsave, wissave, chasave,
                    acrobat, handle, arcana, athlet, decept, hist, insight, intimidat, invest,
                    med, nat, percep, perform, persuas, relig, sohand, stealth, surviv, passpercep,
                    atk1name, atk1bonus, atk1dam, atk2name, atk2bonus, atk2dam, atk3name, atk3bonus, atk3dam,
                    profics, lang, feats, equip, inv, cp, sp, ep, gp, pp,
                    spellabil, spelldc, spellbonus, cantrips, lvl1spell, lvl2spell, lvl3spell, lvl4spell,
                    lvl5spell, lvl6spell, lvl7spell, lvl8spell, lvl9spell) {
  this.name = name;
  this.owner = '';
    this.level=lvl;

  this.class = cclass;
  this.race = race;
  this.background = backg;
  this.alignment = align;
  this.strength = str; this.dexterity = dex; this.consitution = con;
  this.intelligence = int; this.wisdom = wis; this.charisma = cha;
  this.strengthModifier = strmod; this.dexterityModifier = dexmod; this.consitutionModifier = conmod;
  this.intelligenceModifier = intmod; this.wisdomModifier = wismod; this.charismaModifier = chamod;
  this.armorClass = AC;
  this.initiative = init;
  this.moveSpeed = spd;
  this.hitDice = hpdice; this.maxHitPoints = hpmax; this.currentHitPoints = hpcurr;
  this.proficiency = profic;
  this.strengthSave = strsave; this.dexteritySave = dexsave; this.consitutionSave = consave;
  this.intelligenceSave = intsave; this.wisdomSave = wissave; this.charismaSave = chasave;
  this.acrobatics = acrobat; this.animalHandling = handle; this.arcana = arcana;
  this.athleticism = athlet; this.deception = decept; this.history = hist;
  this.insight = insight; this.intimidation = intimidat; this.investigation = invest;
  this.medicine = med; this.nature = nat; this.perception = percep;
  this.performance = perform; this.persuasion = persuas; this.religion = relig;
  this.sleightOfHand = sohand; this.stealth = stealth; this.survival = surviv;
  this.passivePerception = passpercep;
  this.attack1Name = atk1name; this.attack1Bonus = atk1bonus; this.attack1damage = atk1dam;
  this.attack2Name = atk2name; this.attack2Bonus = atk2bonus; this.attack2damage = atk2dam;
  this.attack3Name = atk3name; this.attack3Bonus = atk3bonus; this.attack3damage = atk3dam;
  this.proficiencies = profics; this.language = lang; this.features = feats;
  this.equipment = equip; this.inventory = inv; this.copperPieces = cp;
  this.silverPieces = sp; this.electrumPieces = ep; this.goldPieces = gp;
  this.platinumPieces = pp;
  this.spellcastingAbility = spellabil; this.spellSaveDC = spelldc; this.spellAttackBonus = spellbonus;
  this.cantrips = cantrips; this.level1Spells = lvl1spell; this.level2Spells = lvl2spell;
  this.level3Spells = lvl3spell; this.level4Spells = lvl4spell; this.level5Spells = lvl5spell;
  this.level6Spells = lvl6spell; this.level7Spells = lvl7spell; this.level8Spells = lvl8spell;
  this.level9Spells = lvl9spell;
},

  createEmpty: function () {
  this.name='';
  this.owner=''
  this.avatar='';
  this.level=1;
  this.class='';
  this.race='';
  this.gender='';
  this.hair='';
  this.eyes='';
  this.size='';
  this.height='';
  this.weight='';
  this.experience=0;
  this.nextlevelexp=0;
  this.vision='';
  this.background='';
  this.alignment='';
  
  this.strength=0; this.dexterity=0; this.consitution=0;
  this.intelligence=0; this.wisdom=0; this.charisma=0;
  this.strengthModifier=0; this.dexterityModifier=0; this.consitutionModifier=0;
  this.intelligenceModifier=0; this.wisdomModifier=0; this.charismaModifier=0;
  
  this.armorClass=0;
  this.initiative=0;
  this.moveSpeed=0;
  this.hitDice=0; this.maxHitPoints=0; this.currentHitPoints=0; this.temporaryHitPoints=0;
  this.proficiency=0;
  
  this.strengthSave=0; this.dexteritySave=0; this.consitutionSave=0;
  this.intelligenceSave=0; this.wisdomSave=0; this.charismaSave=0;
  
  this.acrobatics=0; this.animalHandling=0; this.arcana=0;
  this.athleticism=0; this.deception=0; this.history=0;
  this.insight=0; this.intimidation=0; this.investigation=0;
  this.medicine=0; this.nature=0; this.perception=0;
  this.performance=0; this.persuasion=0; this.religion=0;
  this.sleightOfHand = 0; this.stealth = 0; this.survival = 0;
  this.passivePerception = 0;
  this.attack1Name = ''; this.attack1Bonus = 0; this.attack1damage = 0;
  this.attack2Name = ''; this.attack2Bonus = 0; this.attack2damage = 0;
  this.attack3Name = ''; this.attack3Bonus = 0; this.attack3damage = 0;
  this.proficiencies = ''; this.language = []; this.features = [];
  this.equipment = []; this.inventory = []; this.copperPieces = 0;
  this.silverPieces = 0; this.electrumPieces = 0; this.goldPieces = 0;
  this.platinumPieces = 0;
  this.spellcastingAbility = 0; this.spellSaveDC = 0; this.spellAttackBonus = 0;
  this.cantrips = 0; this.level1Spells = 0; this.level2Spells = 0;
  this.level3Spells = 0; this.level4Spells = 0; this.level5Spells = 0;
  this.level6Spells = 0; this.level7Spells = 0; this.level8Spells = 0;
  this.level9Spells = 0;
  this.spellsPrepared;
} 
};
