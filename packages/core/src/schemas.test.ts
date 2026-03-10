import { describe, it, expect } from "vitest";
import {
  createHouseholdSchema,
  updateHouseholdSchema,
  householdThemeSchema,
  createPetSchema,
  updatePetSchema,
  createActivitySchema,
  createInvitationSchema,
  createAccessRequestSchema,
  createFeedingScheduleSchema,
  updateFeedingScheduleSchema,
  logFeedingSchema,
  snoozeFeedingSchema,
  calendarMonthInputSchema,
  createHealthRecordSchema,
  createMedicationSchema,
  createExpenseSchema,
  updateExpenseSchema,
  financeSummaryInputSchema,
  createNoteSchema,
  updateNoteSchema,
  reportDateRangeSchema,
  reportingCompletionLogSchema,
  reportingTrendsSchema,
  trackEventSchema,
  onboardHouseholdSchema,
} from "./schemas";

// ── Household ──

describe("createHouseholdSchema", () => {
  it("accepts valid input", () => {
    expect(createHouseholdSchema.parse({ name: "My Home" })).toEqual({
      name: "My Home",
    });
  });

  it("accepts name with theme", () => {
    const result = createHouseholdSchema.parse({
      name: "Test",
      theme: {
        primaryColor: "#FF5733",
        secondaryColor: "#33FF57",
        avatar: null,
      },
    });
    expect(result.theme?.primaryColor).toBe("#FF5733");
  });

  it("rejects empty name", () => {
    expect(() => createHouseholdSchema.parse({ name: "" })).toThrow();
  });

  it("rejects name over 100 chars", () => {
    expect(() =>
      createHouseholdSchema.parse({ name: "a".repeat(101) })
    ).toThrow();
  });
});

describe("householdThemeSchema", () => {
  it("rejects invalid hex color", () => {
    expect(() =>
      householdThemeSchema.parse({
        primaryColor: "red",
        secondaryColor: "#33FF57",
        avatar: null,
      })
    ).toThrow();
  });

  it("rejects 3-digit hex", () => {
    expect(() =>
      householdThemeSchema.parse({
        primaryColor: "#F00",
        secondaryColor: "#33FF57",
        avatar: null,
      })
    ).toThrow();
  });

  it("accepts valid avatar URL", () => {
    const result = householdThemeSchema.parse({
      primaryColor: "#FF5733",
      secondaryColor: "#33FF57",
      avatar: "https://example.com/photo.jpg",
    });
    expect(result.avatar).toBe("https://example.com/photo.jpg");
  });
});

// ── Pet ──

describe("createPetSchema", () => {
  it("accepts minimal pet", () => {
    const result = createPetSchema.parse({ name: "Buddy", species: "dog" });
    expect(result.name).toBe("Buddy");
    expect(result.species).toBe("dog");
  });

  it("accepts all species types", () => {
    for (const species of ["dog", "cat", "bird", "fish", "reptile", "other"]) {
      expect(
        createPetSchema.parse({ name: "Test", species }).species
      ).toBe(species);
    }
  });

  it("rejects invalid species", () => {
    expect(() =>
      createPetSchema.parse({ name: "Test", species: "dragon" })
    ).toThrow();
  });

  it("rejects empty name", () => {
    expect(() => createPetSchema.parse({ name: "", species: "cat" })).toThrow();
  });

  it("rejects negative weight", () => {
    expect(() =>
      createPetSchema.parse({ name: "Test", species: "dog", weight: -5 })
    ).toThrow();
  });

  it("accepts zero weight as invalid (must be positive)", () => {
    expect(() =>
      createPetSchema.parse({ name: "Test", species: "dog", weight: 0 })
    ).toThrow();
  });

  it("accepts full pet with all fields", () => {
    const result = createPetSchema.parse({
      name: "Buddy",
      species: "dog",
      breed: "Golden Retriever",
      color: "Golden",
      sex: "male",
      dateOfBirth: "2020-01-15",
      weight: 30.5,
      adoptionDate: "2020-03-01",
      microchipNumber: "123456789",
      rabiesTagNumber: "RT-001",
      medicalNotes: "Allergic to chicken",
    });
    expect(result.breed).toBe("Golden Retriever");
    expect(result.weight).toBe(30.5);
  });
});

describe("updatePetSchema", () => {
  it("accepts empty update (all fields optional)", () => {
    const result = updatePetSchema.parse({});
    expect(result).toEqual({});
  });

  it("accepts partial update", () => {
    const result = updatePetSchema.parse({ name: "New Name" });
    expect(result.name).toBe("New Name");
  });
});

// ── Activity ──

describe("createActivitySchema", () => {
  it("accepts valid activity", () => {
    const result = createActivitySchema.parse({
      petId: "abc",
      type: "walk",
      title: "Morning walk",
    });
    expect(result.type).toBe("walk");
  });

  it("rejects invalid activity type", () => {
    expect(() =>
      createActivitySchema.parse({
        petId: "abc",
        type: "swimming",
        title: "Pool time",
      })
    ).toThrow();
  });

  it("rejects title over 200 chars", () => {
    expect(() =>
      createActivitySchema.parse({
        petId: "abc",
        type: "walk",
        title: "a".repeat(201),
      })
    ).toThrow();
  });
});

// ── Invitation ──

describe("createInvitationSchema", () => {
  it("accepts valid role without email", () => {
    const result = createInvitationSchema.parse({ role: "member" });
    expect(result.role).toBe("member");
  });

  it("accepts valid role with email", () => {
    const result = createInvitationSchema.parse({
      role: "admin",
      email: "test@example.com",
    });
    expect(result.email).toBe("test@example.com");
  });

  it("rejects owner role (not invitable)", () => {
    expect(() =>
      createInvitationSchema.parse({ role: "owner" })
    ).toThrow();
  });

  it("rejects invalid email format", () => {
    expect(() =>
      createInvitationSchema.parse({ role: "member", email: "not-an-email" })
    ).toThrow();
  });
});

// ── Access Request ──

describe("createAccessRequestSchema", () => {
  it("accepts valid request", () => {
    const result = createAccessRequestSchema.parse({
      joinCode: "ABC123",
      displayName: "John",
    });
    expect(result.joinCode).toBe("ABC123");
  });

  it("rejects message over 500 chars", () => {
    expect(() =>
      createAccessRequestSchema.parse({
        joinCode: "ABC",
        displayName: "John",
        message: "a".repeat(501),
      })
    ).toThrow();
  });
});

// ── Feeding ──

describe("createFeedingScheduleSchema", () => {
  it("accepts valid schedule", () => {
    const result = createFeedingScheduleSchema.parse({
      petId: "550e8400-e29b-41d4-a716-446655440000",
      label: "Breakfast",
      time: "08:00",
    });
    expect(result.label).toBe("Breakfast");
  });

  it("rejects invalid time format", () => {
    expect(() =>
      createFeedingScheduleSchema.parse({
        petId: "550e8400-e29b-41d4-a716-446655440000",
        label: "Lunch",
        time: "8:00",
      })
    ).toThrow();
  });

  it("rejects invalid UUID for petId", () => {
    expect(() =>
      createFeedingScheduleSchema.parse({
        petId: "not-a-uuid",
        label: "Dinner",
        time: "18:00",
      })
    ).toThrow();
  });
});

describe("logFeedingSchema", () => {
  it("accepts valid log", () => {
    const result = logFeedingSchema.parse({
      feedingScheduleId: "550e8400-e29b-41d4-a716-446655440000",
      feedingDate: "2026-03-09",
    });
    expect(result.feedingDate).toBe("2026-03-09");
  });

  it("rejects invalid date format", () => {
    expect(() =>
      logFeedingSchema.parse({
        feedingScheduleId: "550e8400-e29b-41d4-a716-446655440000",
        feedingDate: "03/09/2026",
      })
    ).toThrow();
  });
});

describe("snoozeFeedingSchema", () => {
  it("uses default snooze duration of 120", () => {
    const result = snoozeFeedingSchema.parse({
      feedingScheduleId: "550e8400-e29b-41d4-a716-446655440000",
      feedingDate: "2026-03-09",
    });
    expect(result.snoozeDurationMinutes).toBe(120);
  });

  it("rejects snooze under 15 minutes", () => {
    expect(() =>
      snoozeFeedingSchema.parse({
        feedingScheduleId: "550e8400-e29b-41d4-a716-446655440000",
        feedingDate: "2026-03-09",
        snoozeDurationMinutes: 5,
      })
    ).toThrow();
  });

  it("rejects snooze over 480 minutes", () => {
    expect(() =>
      snoozeFeedingSchema.parse({
        feedingScheduleId: "550e8400-e29b-41d4-a716-446655440000",
        feedingDate: "2026-03-09",
        snoozeDurationMinutes: 500,
      })
    ).toThrow();
  });
});

// ── Calendar ──

describe("calendarMonthInputSchema", () => {
  it("accepts valid YYYY-MM", () => {
    expect(calendarMonthInputSchema.parse({ month: "2026-03" }).month).toBe(
      "2026-03"
    );
  });

  it("rejects invalid format", () => {
    expect(() => calendarMonthInputSchema.parse({ month: "March 2026" })).toThrow();
  });
});

// ── Health ──

describe("createHealthRecordSchema", () => {
  it("accepts valid health record", () => {
    const result = createHealthRecordSchema.parse({
      petId: "550e8400-e29b-41d4-a716-446655440000",
      type: "vet_visit",
      date: "2026-03-01",
    });
    expect(result.type).toBe("vet_visit");
  });

  it("rejects negative cost", () => {
    expect(() =>
      createHealthRecordSchema.parse({
        petId: "550e8400-e29b-41d4-a716-446655440000",
        type: "vaccination",
        date: "2026-03-01",
        cost: -50,
      })
    ).toThrow();
  });

  it("accepts zero cost", () => {
    const result = createHealthRecordSchema.parse({
      petId: "550e8400-e29b-41d4-a716-446655440000",
      type: "checkup",
      date: "2026-03-01",
      cost: 0,
    });
    expect(result.cost).toBe(0);
  });
});

// ── Medication ──

describe("createMedicationSchema", () => {
  it("accepts minimal medication", () => {
    const result = createMedicationSchema.parse({
      petId: "550e8400-e29b-41d4-a716-446655440000",
      name: "Apoquel",
    });
    expect(result.name).toBe("Apoquel");
  });

  it("rejects empty medication name", () => {
    expect(() =>
      createMedicationSchema.parse({
        petId: "550e8400-e29b-41d4-a716-446655440000",
        name: "",
      })
    ).toThrow();
  });
});

// ── Finance ──

describe("createExpenseSchema", () => {
  it("accepts valid expense", () => {
    const result = createExpenseSchema.parse({
      petId: "550e8400-e29b-41d4-a716-446655440000",
      category: "food",
      description: "Premium kibble",
      amount: 45.99,
      date: "2026-03-01",
    });
    expect(result.category).toBe("food");
    expect(result.amount).toBe(45.99);
  });

  it("rejects zero amount", () => {
    expect(() =>
      createExpenseSchema.parse({
        petId: "550e8400-e29b-41d4-a716-446655440000",
        category: "food",
        description: "Free sample",
        amount: 0,
        date: "2026-03-01",
      })
    ).toThrow();
  });

  it("rejects negative amount", () => {
    expect(() =>
      createExpenseSchema.parse({
        petId: "550e8400-e29b-41d4-a716-446655440000",
        category: "food",
        description: "Refund",
        amount: -10,
        date: "2026-03-01",
      })
    ).toThrow();
  });

  it("rejects invalid category", () => {
    expect(() =>
      createExpenseSchema.parse({
        petId: "550e8400-e29b-41d4-a716-446655440000",
        category: "luxury",
        description: "Diamond collar",
        amount: 5000,
        date: "2026-03-01",
      })
    ).toThrow();
  });
});

describe("financeSummaryInputSchema", () => {
  it("accepts valid YYYY-MM", () => {
    expect(financeSummaryInputSchema.parse({ month: "2026-03" }).month).toBe(
      "2026-03"
    );
  });

  it("accepts empty (defaults to current month)", () => {
    expect(financeSummaryInputSchema.parse({}).month).toBeUndefined();
  });
});

// ── Notes ──

describe("createNoteSchema", () => {
  it("accepts household-level note (no petId)", () => {
    const result = createNoteSchema.parse({
      title: "Vet instructions",
      content: "Give medication twice daily",
    });
    expect(result.petId).toBeUndefined();
  });

  it("accepts pet-specific note", () => {
    const result = createNoteSchema.parse({
      petId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Diet notes",
      content: "Allergic to chicken",
    });
    expect(result.petId).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("rejects empty title", () => {
    expect(() =>
      createNoteSchema.parse({ title: "", content: "Some content" })
    ).toThrow();
  });

  it("rejects empty content", () => {
    expect(() =>
      createNoteSchema.parse({ title: "Title", content: "" })
    ).toThrow();
  });

  it("rejects content over 5000 chars", () => {
    expect(() =>
      createNoteSchema.parse({ title: "Title", content: "a".repeat(5001) })
    ).toThrow();
  });
});

// ── Reporting ──

describe("reportDateRangeSchema", () => {
  it("accepts valid date range", () => {
    const result = reportDateRangeSchema.parse({
      from: "2026-01-01",
      to: "2026-03-09",
    });
    expect(result.from).toBe("2026-01-01");
  });

  it("rejects invalid date format", () => {
    expect(() =>
      reportDateRangeSchema.parse({ from: "Jan 1", to: "Mar 9" })
    ).toThrow();
  });
});

describe("reportingTrendsSchema", () => {
  it("accepts daily granularity", () => {
    const result = reportingTrendsSchema.parse({
      from: "2026-01-01",
      to: "2026-03-09",
      granularity: "daily",
    });
    expect(result.granularity).toBe("daily");
  });

  it("rejects invalid granularity", () => {
    expect(() =>
      reportingTrendsSchema.parse({
        from: "2026-01-01",
        to: "2026-03-09",
        granularity: "monthly",
      })
    ).toThrow();
  });
});

// ── Analytics ──

describe("trackEventSchema", () => {
  it("accepts minimal event", () => {
    const result = trackEventSchema.parse({ eventName: "page_view" });
    expect(result.eventName).toBe("page_view");
  });

  it("accepts event with metadata", () => {
    const result = trackEventSchema.parse({
      eventName: "button_click",
      householdId: "550e8400-e29b-41d4-a716-446655440000",
      metadata: { buttonId: "add-pet", page: "dashboard" },
    });
    expect(result.metadata?.buttonId).toBe("add-pet");
  });

  it("rejects empty event name", () => {
    expect(() => trackEventSchema.parse({ eventName: "" })).toThrow();
  });
});

// ── Onboarding ──

describe("onboardHouseholdSchema", () => {
  it("accepts valid onboarding input", () => {
    const result = onboardHouseholdSchema.parse({
      name: "Smith Family",
      displayName: "John",
    });
    expect(result.name).toBe("Smith Family");
    expect(result.displayName).toBe("John");
  });

  it("rejects empty display name", () => {
    expect(() =>
      onboardHouseholdSchema.parse({ name: "Home", displayName: "" })
    ).toThrow();
  });

  it("rejects display name over 50 chars", () => {
    expect(() =>
      onboardHouseholdSchema.parse({
        name: "Home",
        displayName: "a".repeat(51),
      })
    ).toThrow();
  });
});
