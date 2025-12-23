/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  type CommandContext,
  type SlashCommand,
  CommandKind,
} from './types.js';
import { MessageType, type HistoryItemSkillsList } from '../types.js';
import { SettingScope } from '../../config/settings.js';

export const skillsCommand: SlashCommand = {
  name: 'skills',
  description:
    'List, enable, or disable Gemini CLI agent skills. Usage: /skills [desc | disable <name> | enable <name>]',
  kind: CommandKind.BUILT_IN,
  autoExecute: false,
  subCommands: [
    {
      name: 'disable',
      description: 'Disable a skill by name. Usage: /skills disable <name>',
      action: async (context: CommandContext, args?: string): Promise<void> => {
        const skillName = args?.trim();
        if (!skillName) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: 'Please provide a skill name to disable.',
            },
            Date.now(),
          );
          return;
        }

        const skillManager = context.services.config?.getSkillManager();
        const skill = skillManager
          ?.getSkills()
          .find((s) => s.name === skillName);
        if (!skill) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: `Skill "${skillName}" not found.`,
            },
            Date.now(),
          );
          return;
        }

        const currentDisabled =
          context.services.settings.merged.skills?.disabled ?? [];
        if (currentDisabled.includes(skillName)) {
          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: `Skill "${skillName}" is already disabled.`,
            },
            Date.now(),
          );
          return;
        }

        const newDisabled = [...currentDisabled, skillName];
        const scope = context.services.settings.workspace.path
          ? SettingScope.Workspace
          : SettingScope.User;

        context.services.settings.setValue(
          scope,
          'skills.disabled',
          newDisabled,
        );
        context.ui.addItem(
          {
            type: MessageType.INFO,
            text: `Skill "${skillName}" disabled in ${scope} settings. Restart required to take effect.`,
          },
          Date.now(),
        );
      },
    },
    {
      name: 'enable',
      description:
        'Enable a disabled skill by name. Usage: /skills enable <name>',
      action: async (context: CommandContext, args?: string): Promise<void> => {
        const skillName = args?.trim();
        if (!skillName) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: 'Please provide a skill name to enable.',
            },
            Date.now(),
          );
          return;
        }

        const currentDisabled =
          context.services.settings.merged.skills?.disabled ?? [];
        if (!currentDisabled.includes(skillName)) {
          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: `Skill "${skillName}" is not disabled.`,
            },
            Date.now(),
          );
          return;
        }

        const newDisabled = currentDisabled.filter(
          (name) => name !== skillName,
        );
        const scope = context.services.settings.workspace.path
          ? SettingScope.Workspace
          : SettingScope.User;

        context.services.settings.setValue(
          scope,
          'skills.disabled',
          newDisabled,
        );
        context.ui.addItem(
          {
            type: MessageType.INFO,
            text: `Skill "${skillName}" enabled in ${scope} settings. Restart required to take effect.`,
          },
          Date.now(),
        );
      },
    },
  ],
  action: async (context: CommandContext, args?: string): Promise<void> => {
    const subCommand = args?.trim();

    if (subCommand?.startsWith('disable ')) {
      return skillsCommand.subCommands![0].action(
        context,
        subCommand.slice('disable '.length),
      );
    }
    if (subCommand === 'disable') {
      return skillsCommand.subCommands![0].action(context, '');
    }
    if (subCommand?.startsWith('enable ')) {
      return skillsCommand.subCommands![1].action(
        context,
        subCommand.slice('enable '.length),
      );
    }
    if (subCommand === 'enable') {
      return skillsCommand.subCommands![1].action(context, '');
    }

    // Default to NOT showing descriptions. The user must opt in with an argument.
    let useShowDescriptions = false;
    if (subCommand === 'desc' || subCommand === 'descriptions') {
      useShowDescriptions = true;
    }

    const skillManager = context.services.config?.getSkillManager();
    if (!skillManager) {
      context.ui.addItem(
        {
          type: MessageType.ERROR,
          text: 'Could not retrieve skill manager.',
        },
        Date.now(),
      );
      return;
    }

    const skills = skillManager.getSkills();

    const skillsListItem: HistoryItemSkillsList = {
      type: MessageType.SKILLS_LIST,
      skills: skills.map((skill) => ({
        name: skill.name,
        description: skill.description,
      })),
      showDescriptions: useShowDescriptions,
    };

    context.ui.addItem(skillsListItem, Date.now());
  },
};
