const calculateRedbullMetrics = (feature) => {
  const getValue = (value, defaultValue = 0) => {
    return value === null || value === undefined || value === ""
      ? defaultValue
      : value;
  };

  const normalize = (value) => {
    return String(getValue(value, ""))
      .trim()
      .toLowerCase();
  };

  // ==========================================
  // Basic conditions
  // ==========================================

  const status = normalize(feature.status);
  const project = normalize(feature.project);

  // ==========================================
  // Redbull Availability
  // ==========================================

  let redbullAvailability = 0;

  if (status === "زيارة ناجحة" && project === "vip") {
    const baseFaces =
      Number(getValue(feature.rb_ed_250ml_shelf_avail, 0)) +
      Number(getValue(feature.rb_sf_250ml_shelf_avail, 0)) +
      Number(getValue(feature.rb_white_250ml_shelf_avl, 0)) +
      Number(getValue(feature.rb_purple_250ml_shelf_avl, 0)) +
      Number(getValue(feature.rb_zero_250ml_shelf_avail, 0));

    redbullAvailability =
      baseFaces > 0
        ? Number(((baseFaces / 6) * 100).toFixed(1))
        : 0;
  }

  // ==========================================
  // Availability Compliance
  // ==========================================

  const rbAvailabilityCompliance =
    redbullAvailability === 100 ? 1 : 0;

  // ==========================================
  // Availability Incentive
  // ==========================================

  const outlet = normalize(feature.VIP_Contract);

  const rbAvailabilityIncentive =
    outlet === "gas station" && rbAvailabilityCompliance === 1
      ? 3
      : 0;

  // ==========================================
  // Return all calculated values
  // ==========================================

  return {
    Redbull_Availability: redbullAvailability,

    rb_availability_compliance:
      rbAvailabilityCompliance,

    rb_availability_incentive:
      rbAvailabilityIncentive,
  };
};

export default calculateRedbullMetrics;