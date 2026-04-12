import { registry } from './registry';
import { fileWriteTool } from './file-write';
import { emailSendTool } from './email-send';
import { calendarCreateEventTool } from './calendar-create-event';
import { dbMigrateTool } from './db-migrate';
import { stripeChargeTool } from './stripe-charge';

export function registerAllTools(): void {
    registry.register(fileWriteTool);
    registry.register(emailSendTool);
    registry.register(calendarCreateEventTool);
    registry.register(dbMigrateTool);
    registry.register(stripeChargeTool);
}
