interface MessageOpenSettings {
  action: 'open-settings';
}

interface MessageUnknown {
  action: string;
}

type Message = MessageOpenSettings | MessageUnknown;
