// ==UserScript==
// @name           Tiberium Alliances Combat Simulator
// @description    Allows you to simulate combat before actually attacking.
// @namespace      https://prodgame*.alliances.commandandconquer.com/*/index.aspx* 
// @include        https://prodgame*.alliances.commandandconquer.com/*/index.aspx*
// @version        1.3.0.8
// @author         WildKatana
// @require        http://sizzlemctwizzle.com/updater.php?id=130344&days=1
// ==/UserScript==
(function () {
  var TASuite_mainFunction = function () {
      function createTweak() {
        var TASuite = {};
        qx.Class.define("TASuite.main", {
          type: "singleton",
          extend: qx.core.Object,
          members: {
            buttonSimulateCombat: null,
            buttonLayoutSave: null,
            buttonLayoutLoad: null,
            buttonReturnSetup: null,
            buttonUnlockAttack: null,
            
            add_ViewModeChange: null,
            
            attacker_modules: null,
            defender_modules: null,
            
            lastPercentage: null,
            lastRepairTime: null,
            lastEnemyPercentage: null,
            lastDFPercentage: null,
            lastCYPercentage: null,
            lastInfantryPercentage: null,
            lastVehiclePercentage: null,
            lastAirPercentage: null,
            lastEnemyUnitsPercentage: null,
            lastEnemyBuildingsPercentage: null,
            lastInfantryRepairTime: null,
            lastVehicleRepairTime: null,
            lastAircraftRepairTime: null,
            
            tiberiumSpoils: null,
            crystalSpoils: null,
            creditSpoils: null,
            researchSpoils: null,
            
            units: null,
            units_list: null,
            saved_units: null,
            layoutsList: null,
            layoutsLabelText: null,
            
            battleResultsBox: null,
            
            troopDamageLabel: null,
            enemyTroopStrengthLabel: null,
            enemyBuildingsStrengthLabel: null,
            enemyUnitsStrengthLabel: null,
            airTroopStrengthLabel: null,
            infantryTroopStrengthLabel: null,
            vehicleTroopStrengthLabel: null,
            CYTroopStrengthLabel: null,
            DFTroopStrengthLabel: null,
            simTroopDamageLabel: null,
            simRepairTimeLabel: null,
            simVictoryLabel: null,
            enemySupportLevelLabel: null,
            enemySupportStrengthLabel: null,
            
            initialize: function () {
              this.add_ViewModeChange = (new ClientLib.Vis.ViewModeChange).HGL(this, this.onViewChange);
              this.buttonSimulateCombat = new qx.ui.form.Button("Simulate");
              this.buttonSimulateCombat.set({
                width: 80,
                appearance: "button-text-small",
                toolTipText: "Start Combat Simulation"
              });
              this.buttonSimulateCombat.addListener("click", this.startSimulation, this);

              this.buttonReturnSetup = new qx.ui.form.Button("Setup");
              this.buttonReturnSetup.set({
                width: 80,
                appearance: "button-text-small",
                toolTipText: "Return to Combat Setup"
              });
              this.buttonReturnSetup.addListener("click", this.returnSetup, this);
              
              var replayBar = qx.core.Init.getApplication().getReportReplayOverlay();
              replayBar.add(this.buttonReturnSetup, {
                top: 10,
                right: 80
              });

              _this = this;
              setTimeout(function () {
                try {
                  // Get the active modules
                  // Doing this the hard and unreliable way for now, until we figure out a better way
                  _this.attacker_modules = {};
                  _this.attacker_modules.l = [];
                  var g = ClientLib.Res.ResMain.GetInstance();
                  
                  // Get the player faction
                  // var gdi_unit_ids = g.GetFactionUnitIds(1);
                  // var nod_unit_ids = g.GetFactionUnitIds(2);
                  // var forgotten_unit_ids = g.GetFactionUnitIds(3);
                  
                  var player_research = ClientLib.Data.MainData.GetInstance().get_Player().get_PlayerResearch();
                  
                  for (var i in g.YEJ.units) {
                    var ug = g.GetUnit_Obj(i);
                    var research = player_research.GetResearchItemFomMdbId(ug.tl);
                    
                    var modules = ug.m;
                    for (var j in modules) {
                      var module = modules[j];
                      if (research && module.r.length > 0) {
                        try {
                          // This is an upgradeable ability
                          var required_level = module.r[0].l;
                          var current_level = research.get_CurrentLevel();
                          if (current_level >= required_level) {
                            _this.attacker_modules.l.push(module.i);
                          }
                        }
                        catch (e) {
                          console.log(e);
                        }
                      }
                      else {
                        _this.attacker_modules.l.push(module.i);
                      }
                    }
                  }
                  
                  // Get the defender modules

                  _this.defender_modules = _this.attacker_modules;
                  ClientLib.Vis.VisMain.GetInstance().add_ViewModeChange(_this.add_ViewModeChange);
                } catch (e) {
                  console.log(e);
                }
              }, 10000);

              var armyBar = qx.core.Init.getApplication().getUIItem(ClientLib.Data.Missions.PATH.BAR_ATTACKSETUP);
              armyBar.add(this.buttonSimulateCombat, {
                top: 130,
                right: 0
              });
              
              this.buttonUnlockAttack = new qx.ui.form.Button("Unlock");
              this.buttonUnlockAttack.set({
                width: 60,
                height: 45,
                appearance: "button-text-small",
                toolTipText: "Unlock"
              });
              this.buttonUnlockAttack.addListener("click", this.unlockAttacks, this);
              this.buttonUnlockAttack.setOpacity(0.5);
              armyBar.add(this.buttonUnlockAttack, {
                top: 81,
                right: 0
              });
              
              
              // The Battle Simulator box
              this.battleResultsBox = new qx.ui.window.Window("Battle Simulator");
              this.battleResultsBox.setPadding(1);
              this.battleResultsBox.setLayout(new qx.ui.layout.VBox(1));
              this.battleResultsBox.setShowMaximize(false);
              this.battleResultsBox.setShowMinimize(false);
              this.battleResultsBox.moveTo(125, 125);
              this.battleResultsBox.setHeight(350);
              this.battleResultsBox.setWidth(200);

              // The Enemy Vertical Box
              var eVBox = new qx.ui.container.Composite()
              eVBox.setLayout(new qx.ui.layout.VBox(5));
              eVBox.setThemedFont("bold");
              eVBox.setThemedPadding(2);
              eVBox.setThemedBackgroundColor("#eef");
              this.battleResultsBox.add(eVBox);
              // The Enemy Troop Strength Label
              var eHBox1 = new qx.ui.container.Composite();
              eHBox1.setLayout(new qx.ui.layout.HBox(5));
              eHBox1.add(new qx.ui.basic.Label("Enemy Base: "));
              this.enemyTroopStrengthLabel = new qx.ui.basic.Label("100");
              eHBox1.add(this.enemyTroopStrengthLabel);
              this.enemyTroopStrengthLabel.setTextColor("red");
              eVBox.add(eHBox1);
              // Units
              var eHBox4 = new qx.ui.container.Composite();
              eHBox4.setLayout(new qx.ui.layout.HBox(5));
              eHBox4.add(new qx.ui.basic.Label("Defences: "));
              this.enemyUnitsStrengthLabel = new qx.ui.basic.Label("100");
              eHBox4.add(this.enemyUnitsStrengthLabel);
              this.enemyUnitsStrengthLabel.setTextColor("green");
              eVBox.add(eHBox4);
              // Buildings
              var eHBox5 = new qx.ui.container.Composite();
              eHBox5.setLayout(new qx.ui.layout.HBox(5));
              eHBox5.add(new qx.ui.basic.Label("Buildings: "));
              this.enemyBuildingsStrengthLabel = new qx.ui.basic.Label("100");
              eHBox5.add(this.enemyBuildingsStrengthLabel);
              this.enemyBuildingsStrengthLabel.setTextColor("green");
              eVBox.add(eHBox5);
              // Command Center
              var eHBox2 = new qx.ui.container.Composite();
              eHBox2.setLayout(new qx.ui.layout.HBox(5));
              eHBox2.add(new qx.ui.basic.Label("Construction Yard: "));
              this.CYTroopStrengthLabel = new qx.ui.basic.Label("100");
              eHBox2.add(this.CYTroopStrengthLabel);
              this.CYTroopStrengthLabel.setTextColor("red");
              eVBox.add(eHBox2);
              // Defense Facility
              var eHBox3 = new qx.ui.container.Composite();
              eHBox3.setLayout(new qx.ui.layout.HBox(5));
              eHBox3.add(new qx.ui.basic.Label("Defense Facility: "));
              this.DFTroopStrengthLabel = new qx.ui.basic.Label("100");
              eHBox3.add(this.DFTroopStrengthLabel);
              this.DFTroopStrengthLabel.setTextColor("red");
              eVBox.add(eHBox3);
              // The Support Horizontal Box
              var hboxSupportContainer = new qx.ui.container.Composite();
              hboxSupportContainer.setLayout(new qx.ui.layout.HBox(5));
              this.enemySupportLevelLabel = new qx.ui.basic.Label("Suport lvl ");
              hboxSupportContainer.add(this.enemySupportLevelLabel);
              this.enemySupportStrengthLabel = new qx.ui.basic.Label("--: 100");
              hboxSupportContainer.add(this.enemySupportStrengthLabel);
              this.enemySupportStrengthLabel.setTextColor("red");
              eVBox.add(hboxSupportContainer);
              // The Troops Vertical Box
              var tVBox = new qx.ui.container.Composite()
              tVBox.setLayout(new qx.ui.layout.VBox(5));
              tVBox.setThemedFont("bold");
              tVBox.setThemedPadding(2);
              tVBox.setThemedBackgroundColor("#eef");
              this.battleResultsBox.add(tVBox);
              // The Repair Time Label
              var tHBox1 = new qx.ui.container.Composite();
              tHBox1.setLayout(new qx.ui.layout.HBox(5));
              tHBox1.add(new qx.ui.basic.Label("Repair Time: "));
              this.simRepairTimeLabel = new qx.ui.basic.Label("0:00:00");
              tHBox1.add(this.simRepairTimeLabel);
              this.simRepairTimeLabel.setTextColor("blue");
              tVBox.add(tHBox1);
              // The Troop Strength Label
              var tHBox5 = new qx.ui.container.Composite();
              tHBox5.setLayout(new qx.ui.layout.HBox(5));
              tHBox5.add(new qx.ui.basic.Label("Overall: "));
              this.simTroopDamageLabel = new qx.ui.basic.Label("100");
              tHBox5.add(this.simTroopDamageLabel);
              this.simTroopDamageLabel.setTextColor("blue");
              tVBox.add(tHBox5);
              // The Infantry Troop Strength Label
              var tHBox2 = new qx.ui.container.Composite();
              tHBox2.setLayout(new qx.ui.layout.HBox(5));
              tHBox2.add(new qx.ui.basic.Label("Infantry: "));
              this.infantryTroopStrengthLabel = new qx.ui.basic.Label("100");
              tHBox2.add(this.infantryTroopStrengthLabel);
              this.infantryTroopStrengthLabel.setTextColor("green");
              tVBox.add(tHBox2);
              // The Vehicle Troop Strength Label
              var tHBox3 = new qx.ui.container.Composite();
              tHBox3.setLayout(new qx.ui.layout.HBox(5));
              tHBox3.add(new qx.ui.basic.Label("Vehicle: "));
              this.vehicleTroopStrengthLabel = new qx.ui.basic.Label("100");
              tHBox3.add(this.vehicleTroopStrengthLabel);
              this.vehicleTroopStrengthLabel.setTextColor("green");
              tVBox.add(tHBox3);
              // The Air Troop Strength Label
              var tHBox4 = new qx.ui.container.Composite();
              tHBox4.setLayout(new qx.ui.layout.HBox(5));
              tHBox4.add(new qx.ui.basic.Label("Aircraft: "));
              this.airTroopStrengthLabel = new qx.ui.basic.Label("100");
              tHBox4.add(this.airTroopStrengthLabel);
              this.airTroopStrengthLabel.setTextColor("green");
              tVBox.add(tHBox4);

              // The inner Vertical Box
              var vBox = new qx.ui.container.Composite()
              vBox.setLayout(new qx.ui.layout.VBox(5));
              vBox.setThemedFont("bold");
              vBox.setThemedPadding(2);
              vBox.setThemedBackgroundColor("#eef");
              // The Victory Label
              var hBox2 = new qx.ui.container.Composite()
              hBox2.setLayout(new qx.ui.layout.HBox(5));
              hBox2.add(new qx.ui.basic.Label("Outcome: "));
              this.simVictoryLabel = new qx.ui.basic.Label("Unknown");
              hBox2.add(this.simVictoryLabel);
              this.simVictoryLabel.setTextColor("green");
              vBox.add(hBox2);
              
              this.battleResultsBox.add(vBox);
            },
            onDamageDone: function (sender, e) {
              battleground = sender.DamageDone.i[0].o;
              // For the sake of performance, only run this every 10th step
              if (battleground.m_CurrentStep % 10 == 0) {
                window.TASuite.main.getInstance().calculateTroopStrengths(battleground);
                window.TASuite.main.getInstance().updateBattleResultsWindow();
              }
            },
            calculateTroopStrengths: function (battleground) {
              var battleground = ClientLib.Vis.VisMain.GetInstance().get_Battleground();
              var total_hp = 0;
              var end_hp = 0;
              var e_total_hp = 0;
              var e_end_hp = 0;
              var eb_total_hp = 0;
              var eb_end_hp = 0;
              var eu_total_hp = 0;
              var eu_end_hp = 0;
              var i_end_hp = 0;
              var v_end_hp = 0;
              var a_end_hp = 0;
              var v_total_hp = 0;
              var a_total_hp = 0;
              var i_total_hp = 0;
              this.lastDFPercentage = 0;
              this.lastCYPercentage = 0;
              this.SupportLevel = 0;
              this.lastSupportPercentage = 0;
              this.lastInfantryRepairTime = 0;
              this.lastVehicleRepairTime = 0;
              this.lastAircraftRepairTime = 0;
              
              var own_city = ClientLib.Data.MainData.GetInstance().get_Cities().get_CurrentOwnCity();
              var crd = own_city.get_CityRepairData();
              var cud = own_city.get_CityUnitsData();
              var r_types = ClientLib.Base.EResourceType;
              
              var entities = battleground.OAG.d; // m_Entities has been renamed to OAG
              
              console.log(entities);
              
              for (var i in entities) {
                var entity = entities[i];
                var i_entity = entity.UBK; // get_Entity$0() has been removed. Propery is $I.TQL - UBK
                var a_entity = entity.TAK; // get_Entity$0() has been removed. Propery is $I.TQL - UBK
                var current_hp = i_entity.HUL; // m_iHitpointsCurrent has been renamed to HUL
                var max_hp = i_entity.GUL; // m_iHitpoints has been renamed to GUL
                if (a_entity.SIJ == 2) { // m_eAlignment has been renamed to SIJ, Attacker is 2
                  // This is one of the good guys
                  end_hp += current_hp;
                  total_hp += max_hp;
                  switch (a_entity.XIJ) { // MJJ is the movement type
                    case ClientLib.Base.EUnitMovementType.Air:
                    case ClientLib.Base.EUnitMovementType.Air2:
                      a_end_hp += current_hp;
                      a_total_hp += max_hp;
                      break;
                    case ClientLib.Base.EUnitMovementType.Feet:
                      i_end_hp += current_hp;
                      i_total_hp += max_hp;
                      break;
                    case ClientLib.Base.EUnitMovementType.Track:
                    case ClientLib.Base.EUnitMovementType.Wheel:
                      v_end_hp += current_hp;
                      v_total_hp += max_hp;
                      break;
                    case ClientLib.Base.EUnitMovementType.Structure:
                      break;
                  }
                } 
                else {
                  // Enemy Overall
                  e_total_hp += max_hp;
                  e_end_hp += current_hp;
                  
                  switch (a_entity.XIJ) {
                    case ClientLib.Base.EUnitMovementType.Structure:
                      // Enemy Building
                      eb_total_hp += max_hp;
                      eb_end_hp += current_hp;
  
                      if (i_entity.VTL >= 200 && i_entity.VTL <= 205) {
                        this.SupportLevel = parseInt(i_entity.m_iLevel);
                        this.lastSupportPercentage = (current_hp / max_hp) * 100;
                      } else {
                        switch (i_entity.VTL) { // m_MDCTypeId has been renamed to VTL
                        case 112: // CONSTRUCTION YARD
                        case 151:
                        case 177:
                          this.lastCYPercentage = (current_hp / max_hp) * 100;
                          break;
                        case 158: // DEFENSE FACILITY
                        case 131:
                        case 195:
                          this.lastDFPercentage = (current_hp / max_hp) * 100;
                          break;
                        }
                      }
                      break;
                      
                    default:
                      // Enemy Defence
                      eu_total_hp += max_hp;
                      eu_end_hp += current_hp;
                      break;
                  }
                }
              }

              this.lastInfantryPercentage = i_total_hp ? (i_end_hp / i_total_hp) * 100 : 100;
              this.lastVehiclePercentage = v_total_hp ? (v_end_hp / v_total_hp) * 100 : 100;
              this.lastAirPercentage = a_total_hp ? (a_end_hp / a_total_hp) * 100 : 100;

              this.lastEnemyUnitsPercentage = (eu_end_hp / eu_total_hp) * 100;
              this.lastEnemyBuildingsPercentage = (eb_end_hp / eb_total_hp) * 100;
              this.lastEnemyPercentage = (e_end_hp / e_total_hp) * 100;
              this.lastPercentage = (end_hp / total_hp) * 100;

              // Calculate the repair time
              this.lastInfantryRepairTime = crd.XWI(r_types.RepairChargeInf, cud.GetRepairTimeFromEUnitGroup([ClientLib.Data.EUnitGroup.Infantry]), (1 - this.lastInfantryPercentage / 100)); // FIXME - ConvertRepairCost has been renamed to XWI or YWI
              this.lastAircraftRepairTime = crd.XWI(r_types.RepairChargeAir, cud.GetRepairTimeFromEUnitGroup([ClientLib.Data.EUnitGroup.Aircraft]), (1 - this.lastAirPercentage / 100));
              this.lastVehicleRepairTime = crd.XWI(r_types.RepairChargeVeh, cud.GetRepairTimeFromEUnitGroup([ClientLib.Data.EUnitGroup.Vehicle]), (1 - this.lastVehiclePercentage / 100));
              this.lastRepairTime = Math.max(this.lastVehicleRepairTime, this.lastAircraftRepairTime, this.lastInfantryRepairTime);
              
              console.log(this);
            },
            setLabelColor: function (obj, val, dir) {
              var colors = ['black', 'blue', 'green', 'red'];
              var color = colors[0];
              var v = val;
              if (dir >= 0) v = 100.0 - v;
              if (v > 99.99) color = colors[3];
              else if (v > 50) color = colors[2];
              else if (v > 0) color = colors[1];
              obj.setTextColor(color);
            },
            updateLabel100: function (obj, val, dir) {
              this.setLabelColor(obj, val, dir);
              obj.setValue(val.toFixed(2).toString());
            },
            updateLabel100time: function (obj, val, dir, time) {
              var s = val.toFixed(2).toString() + " @ ";
              s += this.formatSecondsAsTime(time, "h:mm:ss");
              this.setLabelColor(obj, val, dir);
              obj.setValue(s);
            },
            updateBattleResultsWindow: function () {
              var colors = ['black', 'blue', 'green', 'red'];
              var s = "";
              var n = 0;
              // VICTORY
              if (this.lastCYPercentage == 0) {
                s = "Total Victory";
                n = 0;
              } else if (this.lastEnemyBuildingsPercentage < 100) {
                s = "Victory";
                n = 1;
              } else {
                s = "Total Defeat";
                n = 3;
              }
              this.simVictoryLabel.setValue(s);
              this.simVictoryLabel.setTextColor(colors[n]);
              this.updateLabel100(this.enemyTroopStrengthLabel, this.lastEnemyPercentage, -1);
              this.updateLabel100(this.enemyUnitsStrengthLabel, this.lastEnemyUnitsPercentage, -1);
              this.updateLabel100(this.enemyBuildingsStrengthLabel, this.lastEnemyBuildingsPercentage, -1);
              this.updateLabel100(this.CYTroopStrengthLabel, this.lastCYPercentage, -1);
              this.updateLabel100(this.DFTroopStrengthLabel, this.lastDFPercentage, -1);
              // -SUPPORT
              var SLabel = (this.SupportLevel > 0) ? this.SupportLevel.toString() : '--';
              this.enemySupportLevelLabel.setValue('Suport lvl ' + SLabel + ': ');
              this.updateLabel100(this.enemySupportStrengthLabel, this.lastSupportPercentage, -1);
              // ATTACKER 
              this.setLabelColor(this.simRepairTimeLabel, this.lastRepairTime / 14400.0, -1); //max is 4h
              this.simRepairTimeLabel.setValue(this.formatSecondsAsTime(this.lastRepairTime, "h:mm:ss"));
              // OVERALL
              this.updateLabel100(this.simTroopDamageLabel, this.lastPercentage, 1);
              // INF
              this.updateLabel100time(this.infantryTroopStrengthLabel, this.lastInfantryPercentage, 1, this.lastInfantryRepairTime);
              // VEH
              this.updateLabel100time(this.vehicleTroopStrengthLabel, this.lastVehiclePercentage, 1, this.lastVehicleRepairTime);
              // AIR
              this.updateLabel100time(this.airTroopStrengthLabel, this.lastAirPercentage, 1, this.lastAircraftRepairTime);
            },
            formatNumberWithCommas: function (x) {
              return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            },
            formatSecondsAsTime: function (secs, format) {
              var hr = Math.floor(secs / 3600);
              var min = Math.floor((secs - (hr * 3600)) / 60);
              var sec = Math.floor(secs - (hr * 3600) - (min * 60));

              if (hr < 10) {
                hr = "0" + hr;
              }
              if (min < 10) {
                min = "0" + min;
              }
              if (sec < 10) {
                sec = "0" + sec;
              }

              if (format != null) {
                var formatted_time = format.replace('hh', hr);
                formatted_time = formatted_time.replace('h', hr * 1 + "");
                formatted_time = formatted_time.replace('mm', min);
                formatted_time = formatted_time.replace('m', min * 1 + "");
                formatted_time = formatted_time.replace('ss', sec);
                formatted_time = formatted_time.replace('s', sec * 1 + "");
                return formatted_time;
              } else {
                return hr + ':' + min + ':' + sec;
              }
            },
            unlockAttacks: function () {
              var armyBar = qx.core.Init.getApplication().getUIItem(ClientLib.Data.Missions.PATH.BAR_ATTACKSETUP);
              armyBar.remove(this.buttonUnlockAttack);
              var _this = this;
              setTimeout(function () {
                armyBar.add(_this.buttonUnlockAttack);
              }, 2000);
            },
            onViewChange: function (oldMode, newMode) {
              try {
                if (oldMode == webfrontend.gui.PlayArea.PlayArea.modes.EMode_CombatSetupDefense && newMode == webfrontend.gui.PlayArea.PlayArea.modes.EMode_PlayerOffense) {
                  // Switched from Combat Setup to the Simulation, show the stats box
                  this.battleResultsBox.open();
                  var battleground = ClientLib.Vis.VisMain.GetInstance().get_Battleground();
                  this.calculateTroopStrengths(battleground);
                  this.updateBattleResultsWindow();
                }
                else {
                  // Close the stats box
                  this.battleResultsBox.close();
                }
              } catch (e) {
                console.log(e);
              }
            },
            returnSetup: function () {
              // Set the scene again, just in case it didn't work the first time
              var app = qx.core.Init.getApplication();
              var player_cities = ClientLib.Data.MainData.GetInstance().get_Cities();
              var current_city = player_cities.get_CurrentCity();
              try {
                app.getPlayArea().setView(webfrontend.gui.PlayArea.PlayArea.modes.EMode_CombatSetupDefense, localStorage.ta_sim_last_city, 0, 0);
              } catch (e) {
                app.getPlayArea().setView(webfrontend.gui.PlayArea.modes.EMode_CombatSetupDefense, localStorage.ta_sim_last_city, 0, 0);
              }
            },
            setupBattleground: function () {
              try {
                $I.LZH.KAI().EAI().JM(-1);
                var mainData = ClientLib.Data.MainData.GetInstance();
                var player_cities = mainData.get_Cities();
                var current_city = player_cities.get_CurrentCity();
                var own_city = player_cities.get_CurrentOwnCity();
                
                // Bust the cache
                //own_city.get_CityArmyFormationsManager().ZJG.d[own_city.get_CityArmyFormationsManager().XJG].UpdateFormation();
                
                localStorage.ta_sim_last_city = current_city.get_Id();

                var alliance = ClientLib.Data.MainData.GetInstance().get_Alliance();
                var combatData = (new $I.CM).$ctor();
                //var combatData = (new $I.CM).QB();
                combatData.RN = 1; // Version
                
                var unitData = own_city.get_CityUnitsData().HIG.l;
                var offense_units = own_city.get_CityArmyFormationsManager().GetFormationByTargetBaseId(current_city.get_Id()).get_ArmyUnits().l;
                var data = new Array();

                for (var i = 0; i < unitData.length; i++) {
                  var info = new Object();
                  info.h = unitData[i].get_Health();
                  info.i = unitData[i].get_MdbUnitId();
                  info.l = unitData[i].get_CurrentLevel();
                  info.x = offense_units[i].get_CoordX();
                  info.y = offense_units[i].get_CoordY();
                  data.push(info);
                }

                combatData.TN = data; // Attackers

                unitData = current_city.get_CityUnitsData().QIG.l;
                data = new Array();
                for (i = 0; i < unitData.length; i++) {
                  info = new Object();
                  info.h = unitData[i].get_Health();
                  info.i = unitData[i].get_MdbUnitId();
                  info.l = unitData[i].get_CurrentLevel();
                  info.x = unitData[i].get_CoordX();
                  info.y = unitData[i].get_CoordY();
                  data.push(info);
                }
                combatData.UN = data; // Defenders

                data = new Array();
                for (var i = 0; i < 9; i++) {
                  for (var j = 0; j < 8 ; j++) {
                    var terrainType = current_city.GetResourceType(i, (j + 8));
                    var unitType = -1;
                    switch (terrainType) {
                      case ClientLib.Data.ECityTerrainType.FOREST:
                        unitType = ClientLib.Base.EUnit.Forest;
                        break;
                      case ClientLib.Data.ECityTerrainType.BRIAR:
                        unitType = ClientLib.Base.EUnit.Scrub;
                        break;
                      case ClientLib.Data.ECityTerrainType.SWAMP:
                        unitType = ClientLib.Base.EUnit.Swamp;
                        break;
                      case ClientLib.Data.ECityTerrainType.WATER:
                        unitType = ClientLib.Base.EUnit.Water;
                        break;
                    }
                    
                    if (unitType != -1) {
                      info = new Object();
                      info.h = 100;
                      info.i = unitType;
                      info.l = 1;
                      info.x = i;
                      info.y = j;
                      data.push(info);
                    }
                  }
                }
                
                combatData.VN = data; // Terrain

                unitData = current_city.get_CityBuildingsData().ZEI.l;
                data = new Array();
                for (i = 0; i < unitData.length; i++) {
                  info = new Object();
                  info.h = unitData[i].get_Health();
                  info.i = unitData[i].get_MdbUnitId();
                  info.l = unitData[i].get_CurrentLevel();
                  info.x = unitData[i].get_CoordX();
                  info.y = unitData[i].get_CoordY();
                  data.push(info);
                }
                
                combatData.WN = data; // Buildings

                combatData.XN = null; // Support Structures
                combatData.SN = 8696244; // Start Step - this is just a random number
                combatData.m_CombatSteps = 1;
                combatData.m_BoostInfantry = alliance.get_POIInfantryBonus();
                combatData.m_BoostVehicle = alliance.get_POIVehicleBonus();
                combatData.m_BoostAir = alliance.get_POIAirBonus();
                combatData.m_BoostDefense = current_city.m_AllianceDefenseBonus ? current_city.m_AllianceDefenseBonus : 0; // This might not be working
                combatData.m_AttackerBaseId = own_city.get_Id();
                combatData.m_AttackerBaseName = own_city.get_Name();
                combatData.m_AttackerPlayerId = own_city.get_PlayerId();
                combatData.m_AttackerPlayerName = own_city.get_PlayerName();
                combatData.m_AttackerAllianceId = own_city.get_AllianceId();
                combatData.m_AttackerAllianceName = own_city.get_AllianceName();
                combatData.m_DefenderBaseId = current_city.get_Id();
                combatData.m_DefenderBaseName = current_city.get_Name();
                combatData.m_DefenderPlayerId = current_city.get_PlayerId();
                combatData.m_DefenderPlayerName = current_city.get_OwnerName();
                combatData.m_DefenderAllianceId = current_city.get_AllianceId();
                combatData.m_DefenderAllianceName = current_city.get_OwnerAllianceName();
                combatData.m_DefenderBlockStep = 0;
                combatData.m_AttackTimeStamp = new Date().getTime();
                var resourceLayout = new Object();
                resourceLayout.l = new Array();
                combatData.m_ResourceLayout = resourceLayout;
                combatData.m_DefenderFaction = current_city.get_CityFaction();
                combatData.m_AttackerModules = this.attacker_modules;
                combatData.m_DefenderModules = this.defender_modules;
                
                if (((combatData.m_DefenderFaction == $I.WHK.FORFaction) || (combatData.m_DefenderFaction == $I.WHK.NPCBase)) || (combatData.m_DefenderFaction == $I.WHK.NPCCamp)) {
                  combatData.GM();
                }

                combatData.m_MaxDuration = 120;
                combatData.m_Complete = false;
                combatData.ZN = null; // Debug

                var battleground = ClientLib.Vis.VisMain.GetInstance().get_Battleground();
                battleground.Reset();
                battleground.VBG = combatData;
                battleground.InitBattle();
                battleground.DXF(combatData);
                battleground.StartBattle();
                if (battleground.FAG < 0x1d4c0) {
                  //battleground.FAG += 0xbb8;
                }

                return battleground;
              } catch (e) {
                console.log(e);
              }
            },
            startSimulation: function () {
              try {
                var app = qx.core.Init.getApplication();
                var player_cities = ClientLib.Data.MainData.GetInstance().get_Cities();
                var current_city = player_cities.get_CurrentCity();

                try {
                  app.getPlayArea().setView(webfrontend.gui.PlayArea.PlayArea.modes.EMode_CombatReplay, current_city.get_Id(), 0, 0);
                } catch (e) {
                  app.getPlayArea().setView(webfrontend.gui.PlayArea.modes.EMode_CombatReplay, current_city.get_Id(), 0, 0);
                }
                var battleground = this.setupBattleground();
                
                // Add the event listeners
                // battleground.m_Simulation.add_DamageDone$0((new System.EventHandler).$ctor(this, this.onDamageDone)); // FIXME - The add_DamageDone$0 has been renamed, and so has the System.EventHandler...

                // Set the scene again, just in case it didn't work the first time
                try {
                  app.getPlayArea().setView(webfrontend.gui.PlayArea.PlayArea.modes.EMode_CombatReplay, current_city.get_Id(), 0, 0);
                } catch (e) {
                  app.getPlayArea().setView(webfrontend.gui.PlayArea.modes.EMode_CombatReplay, current_city.get_Id(), 0, 0);
                }
              } catch (e) {
                console.log(e);
              }
            }
          }
        });
      }

      function TASuite_checkIfLoaded() {
        try {
          if (typeof qx != 'undefined') {
            a = qx.core.Init.getApplication(); // application
            mb = qx.core.Init.getApplication().getMenuBar();
            if (a && mb) {
              createTweak();
              window.TASuite.main.getInstance().initialize();
            } else window.setTimeout(TASuite_checkIfLoaded, 1000);
          } else {
            window.setTimeout(TASuite_checkIfLoaded, 1000);
          }
        } catch (e) {
          if (typeof console != 'undefined') console.log(e);
          else if (window.opera) opera.postError(e);
          else GM_log(e);
        }
      }

      if (/commandandconquer\.com/i.test(document.domain)) {
        window.setTimeout(TASuite_checkIfLoaded, 1000);
      }
    }

    // injecting, because there seem to be problems when creating game interface with unsafeWindow
  var TASuiteScript = document.createElement("script");
  var txt = TASuite_mainFunction.toString();
  TASuiteScript.innerHTML = "(" + txt + ")();";
  TASuiteScript.type = "text/javascript";
  if (/commandandconquer\.com/i.test(document.domain)) {
    document.getElementsByTagName("head")[0].appendChild(TASuiteScript);
  }

})();